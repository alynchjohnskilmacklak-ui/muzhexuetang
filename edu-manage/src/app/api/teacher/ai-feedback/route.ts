import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher, assertTeacherOwnsStudent } from '@/lib/teacher-portal'
import { getStudentProfile } from '@/lib/student-profile'
import { callDeepSeek, callDoubao, AIProviderError } from '@/lib/ai/client'
import { getKnowledgePointOptions } from '@/lib/classroom-feedback/subject-knowledge-points'
import { articleSections } from '@/lib/classroom-feedback/ai-article'
import { findSimilarComments } from '@/lib/classroom-feedback/comment-similarity'

export const dynamic = 'force-dynamic'

// AI 提供方路由：服务器配置了豆包（火山方舟 ARK_API_KEY）则优先用豆包生成，
// 豆包未配置或调用失败时自动回退 DeepSeek，保证老师侧始终有反馈可用。
async function callPrimaryAI(params: {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
}): Promise<string> {
  const doubaoKey = process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY || ''
  const useDoubao = doubaoKey !== '' && !doubaoKey.includes('你的') && !doubaoKey.includes('填入')
  if (useDoubao) {
    try {
      return await callDoubao(params)
    } catch (error) {
      console.warn('[AI-Feedback] 豆包调用失败，自动回退 DeepSeek：', error instanceof Error ? error.message : error)
    }
  }
  return callDeepSeek(params)
}

const aiRateBucket = new Map<string, { count: number; resetAt: number }>()

type Mood = 'GREAT' | 'GOOD' | 'OKAY' | 'NEEDS_ATTENTION'
type Intent = 'stage' | 'suggestion' | 'classroom'
type StudentPerfLevel = 'GREAT' | 'OKAY' | 'NEEDS_IMPROVEMENT'
type AIJson = Record<string, unknown>
interface RosterEntry { id: string; name: string }
interface SelectedStudent { id: string; name?: string | null }
interface StudentPerfInput { id: string; name?: string | null; level: StudentPerfLevel }
interface PerStudentComment { studentId: string; studentName: string; comment: string }

const JUNIOR_QUOTES = [
  '千里之行，始于足下。',
  '不积跬步，无以至千里。',
  '书山有路勤为径，学海无涯苦作舟。',
  '宝剑锋从磨砺出，梅花香自苦寒来。',
  '业精于勤，荒于嬉；行成于思，毁于随。',
  '少壮不努力，老大徒伤悲。',
  '天行健，君子以自强不息。',
  '锲而不舍，金石可镂。',
  '读书破万卷，下笔如有神。',
  '学而不思则罔，思而不学则殆。',
  '一分耕耘，一分收获。',
  '勤能补拙是良训，一分辛苦一分才。',
]

function checkTeacherAILimit(teacherId: string) {
  const now = Date.now()
  const bucket = aiRateBucket.get(teacherId)
  if (bucket && now < bucket.resetAt && bucket.count >= 8) return false
  if (!bucket || now >= bucket.resetAt) aiRateBucket.set(teacherId, { count: 1, resetAt: now + 60_000 })
  else bucket.count += 1
  if (aiRateBucket.size > 500) {
    for (const [k, v] of aiRateBucket) if (now >= v.resetAt) aiRateBucket.delete(k)
  }
  return true
}

function parseAIJson(raw: string): AIJson | null {
  const candidates: string[] = []
  const trimmed = (raw || '').trim()
  candidates.push(trimmed)
  candidates.push(trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim())
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1))

  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      const parsed = JSON.parse(candidate)
      return parsed && typeof parsed === 'object' ? parsed as AIJson : null
    } catch {
      // try the next candidate
    }
  }
  return null
}

function cleanRawText(raw: string) {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/^\s*[{\[]/, '')
    .replace(/[}\]]\s*$/, '')
    .trim()
}

function ensureStructuredFeedback(value: string, context: {
  performanceTags: string[]
  masteryLevel: string
  teacherRemark: string
}) {
  const text = value.trim()
  const labels = ['本节课学习内容', '课堂反馈', '孩子掌握情况']
  if (labels.every((label) => text.includes(`${label}：`) || text.includes(`${label}:`))) {
    return text
      .replace(/(?:^|\s*)(本节课学习内容|课堂反馈|孩子掌握情况)\s*[:：]\s*/g, (_match, label: string) => `${label}：\n`)
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  return [
    `本节课学习内容：\n${text || '本次未记录具体授课知识点，请老师补充。'}`,
    `课堂反馈：\n${context.teacherRemark || context.performanceTags.join('、') || '本次没有记录具体课堂观察。'}`,
    `孩子掌握情况：\n${context.masteryLevel || '尚无足够信息判断掌握情况，请结合练习结果继续观察。'}`,
  ].join('\n\n')
}

function detectIntent(note: string): Intent {
  if (/教师寄语|本期寄语|阶段小结|学情小结|阶段报告|学期总结|生成寄语|写个寄语|写一段评语|帮我生成教师评语|帮我补齐评语|总结.{0,4}(这段时间|这学期|近期)|期末(评语|总结|寄语)|阶段性(评价|总结)|月度小结/.test(note)) return 'stage'
  if (/下一步建议|写建议|生成建议|接下来|后续建议|给个建议|怎么(提高|改进|办)|努力方向|提升方向|回家(练|复习)什么/.test(note)) return 'suggestion'
  return 'classroom'
}

function inferMoodFromNote(note: string): Mood {
  if (/走神|不认真|没完成|没有完成|需要加强|拖拉|粗心|不仔细|不稳定|开小差|打瞌睡|犯困|坐不住|不在状态|有点飘|溜号|讲小话|说话|玩|敷衍|应付|磨蹭|状态一般|不太行/.test(note)) return 'OKAY'
  if (/非常好|很好|主动|进步明显|特别积极|状态很好|表现突出|全对|抢答|状态在线|超出预期|明显变好|比上次强|突飞猛进/.test(note)) return 'GREAT'
  if (/积极|认真|不错|进步|稳定|听讲|还可以|还行|有起色|跟得上|完成得不错|配合/.test(note)) return 'GOOD'
  return 'GOOD'
}

function inferTagsFromNote(note: string, tagOptions: string[] = []): string[] {
  const tags: string[] = []
  const add = (tag: string) => {
    const synonym = tag === '专注度需提升'
      ? tagOptions.find((option) => /(专注|注意力).*(提升|加强|改进)|(提升|加强|改进).*(专注|注意力)/.test(option))
      : undefined
    const resolvedTag = synonym || tag
    if (!tags.includes(resolvedTag)) tags.push(resolvedTag)
  }
  if (/认真|听讲|专注|投入|状态在线/.test(note)) add('认真听讲')
  if (/积极|主动|回答|抢答|发言|举手/.test(note)) add('积极回答')
  if (/进步|提升|变好|起色|比上次强/.test(note)) add('有进步')
  if (/作业.*(不好|没完成|没有完成|没写完|没写|未完成|需要|拖拉|敷衍|应付|忘|漏)|没完成.*作业/.test(note)) add('作业需加强')
  if (/计算|准确率|口算|运算/.test(note)) add('计算能力')
  if (/审题|不仔细|粗心|看错|漏看|马虎/.test(note)) add('审题需加强')
  if (/开小差|走神|溜号|坐不住|讲小话/.test(note)) add('专注度需提升')
  return tags.slice(0, 4)
}

function inferKnowledgePointsFromNote(note: string, options: string[]) {
  if (!options.length) return []
  return options.filter((kp) => note.includes(kp)).slice(0, 4)
}

function inferHomeworkFromNote(note: string): string[] {
  if (!/作业/.test(note)) return []
  return ['按要求完成并订正本节课相关作业']
}

function buildFallbackSuggestion(note: string): string {
  if (/作业/.test(note)) return '接下来建议先保证作业按时、独立完成，再及时订正错题，把课堂听懂的内容真正巩固下来。'
  if (/审题|粗心|不仔细/.test(note)) return '接下来做题时建议先放慢审题速度，圈出关键信息，完成后再检查计算和单位，减少会做但失分的情况。'
  if (/计算|准确率/.test(note)) return '接下来建议继续保持计算训练，做完后养成回看检查的习惯，让正确率更稳定。'
  if (/走神|专注|不认真/.test(note)) return '接下来建议课堂上先把注意力稳定住，跟紧老师的提问和板书，课后再用少量练习巩固。'
  return '接下来建议继续保持课堂参与度，课后及时复盘本节课内容，把已经听懂的部分落实到练习中。'
}

function buildFallbackComment(note: string, studentNames: string[]): string {
  const subject = studentNames.length === 1 ? `${studentNames[0]}同学` : '本组学生'
  const cleanNote = note.replace(/帮我补齐|写得自然|补齐评语|生成反馈/g, '').trim().slice(0, 100)
  return [
    `本节课学习内容：\n${cleanNote || '本次没有记录具体授课内容，请老师补充。'}`,
    `课堂反馈：\n${subject}本次尚未记录可核实的个人课堂表现，请老师补充观察。`,
    '孩子掌握情况：\n目前缺少练习或课堂观察依据，暂不判断掌握程度。',
  ].join('\n\n')
}

function appendUniqueQuote(comment: string, index: number, usedQuotes: Set<string>): string {
  const quoted = comment.match(/「([^」]+)」\s*[。！？]?\s*$/)?.[1]?.trim()
  if (quoted && !usedQuotes.has(quoted)) {
    usedQuotes.add(quoted)
    return comment
  }

  let quote = JUNIOR_QUOTES[index % JUNIOR_QUOTES.length]
  for (let offset = 0; offset < JUNIOR_QUOTES.length; offset += 1) {
    const candidate = JUNIOR_QUOTES[(index + offset) % JUNIOR_QUOTES.length]
    if (!usedQuotes.has(candidate)) {
      quote = candidate
      break
    }
  }
  usedQuotes.add(quote)
  const withoutDuplicateEnding = comment.replace(/\s*「[^」]+」\s*[。！？]?\s*$/, '').trim()
  return `${withoutDuplicateEnding}「${quote}」`
}

function normalizeStudentComment(params: {
  comment: string
  studentName: string
  note: string
  index: number
  usedQuotes: Set<string>
  appendQuote: boolean
}): string {
  const { studentName, note, index, usedQuotes, appendQuote } = params
  let comment = params.comment.trim() || buildFallbackComment(note, [studentName])
  // 清理模型自造的泛指称呼（孩子同学 / 孩子 / 这位同学 / 该同学 / 小朋友等），
  // 统一替换成勾选学生的真实姓名，避免出现“郝学文同学孩子同学……”的叠称呼。
  const genericPrefix = /^(孩子(?:同学)?|这位同学|该同学|该生|宝贝(?:同学)?|小朋友|小同学|同学)\s*[，,：:、.\s]+/
  comment = comment.replace(genericPrefix, `${studentName}同学，`)
  // 若清理后仍不含姓名（例如直接以“能够主动参与课堂……”开头），则在最前补姓名。
  if (!comment.includes(studentName)) {
    comment = comment.includes('课堂反馈：')
      ? comment.replace('课堂反馈：', `课堂反馈：\n${studentName}同学，`)
      : `${studentName}同学，${comment}`
  }
  const trimmed = comment.slice(0, 460)
  return (appendQuote ? appendUniqueQuote(trimmed, index, usedQuotes) : trimmed).slice(0, 500)
}

function buildPerStudentComments(
  note: string,
  resolved: ReturnType<typeof resolveStudentsFromContext>,
  source: unknown,
  fallbackOverallComment = '',
  appendQuote = false,
): PerStudentComment[] {
  const parsedItems = Array.isArray(source) ? source : []
  const byStudentId = new Map<string, string>()
  for (const item of parsedItems) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Record<string, unknown>
    const studentId = String(candidate.studentId || '')
    if (!resolved.matchedIds.includes(studentId) || typeof candidate.comment !== 'string') continue
    byStudentId.set(studentId, candidate.comment)
  }

  const usedQuotes = new Set<string>()
  return resolved.matchedIds.map((studentId, index) => {
    const studentName = resolved.matchedNames[index] || '孩子'
    const modelComment = byStudentId.get(studentId)
      || (resolved.matchedIds.length === 1 ? fallbackOverallComment : '')
      || buildFallbackComment('暂无该生的具体课堂细节记录，请老师补充后再发布。', [studentName])
    return {
      studentId,
      studentName,
      comment: normalizeStudentComment({
        comment: modelComment,
        studentName,
        note,
        index,
        usedQuotes,
        appendQuote,
      }),
    }
  })
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((item) => item.trim()) : []
}

function resolveStudentsFromContext(params: {
  note: string
  roster: RosterEntry[]
  selectedStudentIds: string[]
  selectedStudents: SelectedStudent[]
}) {
  const { note, roster, selectedStudentIds, selectedStudents } = params
  const rosterById = new Map(roster.map((s) => [s.id, s.name]))
  const selectedById = new Map(selectedStudents.map((s) => [s.id, s.name || null]))

  if (selectedStudentIds.length > 0) {
    const matchedNames = selectedStudentIds.map((id) => selectedById.get(id) || rosterById.get(id) || '孩子')
    return { matchedIds: selectedStudentIds, matchedNames, unknownNames: [] as string[], needsManual: false }
  }

  const matchedIds: string[] = []
  const matchedNames: string[] = []
  const unknownNames: string[] = []

  for (const student of roster) {
    if (student.name && note.includes(student.name) && !matchedIds.includes(student.id)) {
      matchedIds.push(student.id)
      matchedNames.push(student.name)
    }
  }

  if (!matchedIds.length) {
    const noteTokens = note.split(/[、，,和跟与及\s]+/).filter(Boolean)
    const candidatesByShortName = new Map<string, RosterEntry[]>()
    for (const student of roster) {
      const name = student.name || ''
      if (name.length < 2) continue
      const shortNames = new Set([name.slice(1), name.slice(-2)].filter((shortName) => shortName.length >= 2))
      for (const shortName of shortNames) {
        if (!noteTokens.some((token) => token.includes(shortName))) continue
        const candidates = candidatesByShortName.get(shortName) || []
        candidates.push(student)
        candidatesByShortName.set(shortName, candidates)
      }
    }

    for (const [shortName, candidates] of candidatesByShortName) {
      const uniqueCandidates = [...new Map(candidates.map((student) => [student.id, student])).values()]
      if (uniqueCandidates.length !== 1) {
        if (!unknownNames.includes(shortName)) unknownNames.push(shortName)
        continue
      }
      const student = uniqueCandidates[0]
      if (!matchedIds.includes(student.id)) {
        matchedIds.push(student.id)
        matchedNames.push(student.name)
      }
    }
  }

  return { matchedIds, matchedNames, unknownNames, needsManual: matchedIds.length === 0 || unknownNames.length > 0 }
}

function buildFallbackResponse(opts: {
  note: string
  intent: Intent
  resolved: ReturnType<typeof resolveStudentsFromContext>
  kpOptions: string[]
  tagOptions?: string[]
  raw?: string
  appendQuote?: boolean
}) {
  const { note, intent, resolved, kpOptions, tagOptions = [], raw, appendQuote = false } = opts
  const rawComment = raw ? cleanRawText(raw) : ''
  const comment = rawComment || buildFallbackComment(note, resolved.matchedNames)
  const suggestion = buildFallbackSuggestion(note)
  const perStudentComments = buildPerStudentComments(note, resolved, [], rawComment, appendQuote)
  return {
    intent,
    studentIds: resolved.matchedIds,
    studentNames: resolved.matchedNames,
    unknownNames: resolved.unknownNames,
    needsManualStudentSelection: resolved.needsManual,
    mood: inferMoodFromNote(note),
    overallComment: intent === 'suggestion' ? '' : comment.slice(0, 400),
    perStudentComments,
    similarityWarnings: findSimilarComments(perStudentComments.map((item) => ({ ...item, comment: articleSections(item.comment)?.[1] || item.comment })), 0.55),
    tags: inferTagsFromNote(note, tagOptions),
    knowledgePoints: inferKnowledgePointsFromNote(note, kpOptions),
    homework: inferHomeworkFromNote(note),
    summary: '',
    suggestion,
    stageSummaryText: intent === 'stage' ? comment.slice(0, 500) : '',
    stageSuggestions: intent === 'suggestion' || intent === 'stage' ? suggestion.slice(0, 200) : '',
  }
}

export const POST = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()

  if (!checkTeacherAILimit(teacher.id)) {
    return NextResponse.json({ error: 'AI 生成请求过于频繁，请 1 分钟后再试' }, { status: 429 })
  }

  const body = await req.json() as {
    studentId?: string; keywords?: string; kind?: 'feedback' | 'stage'
    mode?: 'classroom'; note?: string
    roster?: RosterEntry[]
    selectedStudents?: SelectedStudent[]
    options?: { moods?: Array<{ value: string; label: string }>; tags?: string[]; knowledgePoints?: string[] }
    selected?: { mood?: string; tags?: string[]; knowledgePoints?: string[] }
    selectedStudentIds?: string[]
    studentPerf?: Array<{ id?: string; name?: string | null; level?: string }>
    performanceTags?: string[]
    masteryLevel?: string
    teacherRemark?: string
    grade?: string
    subject?: string
    course?: string
    stageMaterial?: string
    groupId?: string; courseType?: string
    appendQuote?: boolean
    currentForm?: { mood?: string; overallComment?: string; tags?: string[]; knowledgePoints?: string[]; homework?: string[]; summary?: string; suggestion?: string; stageSummaryText?: string; stageSuggestions?: string }
  }

  const performanceTags = stringArray(body.performanceTags).slice(0, 5)
  const masteryLevel = typeof body.masteryLevel === 'string' ? body.masteryLevel.trim().slice(0, 30) : ''
  const teacherRemark = typeof body.teacherRemark === 'string' ? body.teacherRemark.trim().slice(0, 300) : ''
  const note = (typeof body.note === 'string' && body.note.trim()) || teacherRemark || performanceTags.join('、')

  if (note) {
    const roster = Array.isArray(body.roster) ? body.roster.filter((s) => typeof s?.id === 'string') : []
    const selectedStudentIds = Array.isArray(body.selectedStudentIds) ? body.selectedStudentIds.filter((id): id is string => typeof id === 'string') : []
    const selectedStudents = Array.isArray(body.selectedStudents) ? body.selectedStudents.filter((s) => typeof s?.id === 'string') : []
    const studentPerf: StudentPerfInput[] = Array.isArray(body.studentPerf)
      ? body.studentPerf
        .filter((item): item is { id: string; name?: string | null; level: StudentPerfLevel | 'WEAK' } =>
          typeof item?.id === 'string' && (item.level === 'GREAT' || item.level === 'OKAY' || item.level === 'NEEDS_IMPROVEMENT' || item.level === 'WEAK'),
        )
        .map((item) => ({ id: item.id, name: item.name || null, level: item.level === 'WEAK' ? 'NEEDS_IMPROVEMENT' : item.level }))
      : []
    const resolved = resolveStudentsFromContext({ note, roster, selectedStudentIds, selectedStudents })
    const options = body.options || {}
    const moods = Array.isArray(options.moods) ? options.moods : []
    const tagOptions = Array.isArray(options.tags) ? options.tags : []
    const kpOptions = [...new Set([
      ...getKnowledgePointOptions(body.subject, body.grade),
      ...(Array.isArray(options.knowledgePoints) ? options.knowledgePoints : []),
    ])]
    const detectedIntent = detectIntent(note)
    const currentForm = body.currentForm || {}
    const stageMaterial = typeof body.stageMaterial === 'string' ? body.stageMaterial : ''
    const promptRoster = resolved.matchedIds.length
      ? resolved.matchedIds.map((id, index) => ({ id, name: resolved.matchedNames[index] || '孩子' }))
      : roster.slice(0, 60)
    const perfById = new Map(studentPerf.map((item) => [item.id, item]))
    const perfLabel: Record<StudentPerfLevel, string> = { GREAT: '积极', OKAY: '一般', NEEDS_IMPROVEMENT: '需提升' }
    const perfGroups = (['GREAT', 'OKAY', 'NEEDS_IMPROVEMENT'] as StudentPerfLevel[])
      .map((level) => {
        const names = resolved.matchedIds
          .map((id, index) => ({ id, name: resolved.matchedNames[index] || perfById.get(id)?.name || '孩子', level: perfById.get(id)?.level || 'GREAT' }))
          .filter((item) => item.level === level)
          .map((item) => item.name)
        return names.length ? `【${perfLabel[level]}】${names.join('、')}` : ''
      })
      .filter(Boolean)
      .join('　')

    const confirmedStudentText = resolved.matchedIds.length
      ? `【已确认学生】${resolved.matchedIds.map((id, index) => `${resolved.matchedNames[index] || '孩子'}(${id})`).join('、')}。这些就是本次反馈对象，老师输入可以不包含学生姓名，必须直接围绕他们生成反馈。`
      : '【已确认学生】无。若能从班级名单和老师描述中唯一识别学生，请匹配；不能唯一识别时仍然生成反馈内容，并标记需要老师手动选择学生。'

    const sys = [
      '你是牧哲学堂（课外辅导机构）的资深班主任兼任课老师，正在替任课老师给家长写当天的课堂反馈。你的任务是把老师随手记的一句话，扩写成一篇家长愿意读、读得懂、读完知道孩子今天学了什么、学得怎么样、回家怎么配合的反馈文章。',
      '',
      '整体风格：',
      '- 像老师放学后当面跟家长聊孩子：具体、平实、有温度、有细节，不打官腔，不喊口号。整段话要读起来像一篇文章而不是几条干巴巴的结论。',
      "- 禁止：'该生''该同学''表现良好''总体不错'这类套话；禁止堆砌空洞夸奖；禁止编造分数、名次、考试和老师没提到的事件。",
      `- 称呼用'姓名+同学'。每份反馈按“本节课学习内容、课堂反馈、孩子掌握情况”三段展开；有足够老师记录时可写200~400字，记录少时宁可简短也不编造。${body.appendQuote ? '结尾可以保留系统添加的学习寄语。' : '结尾不要加名言或学习寄语。'}`,
      '',
      '知识点扩写（最重要的加分项）：',
      '- 老师输入里明确提到的知识点写进“本节课学习内容”，用1~3句向家长解释概念或方法。不要据此推断学生个人掌握情况，也不要声称已核实具体教材页码。',
      '- 知识点讲解要像老师给家长做科普，让没学过这门课的家长也听得懂；可以展开概念、方法、常见题型和易错点，但严禁讲错内容，拿不准的术语宁可不提。',
      '- 如果老师输入里没有明确知识点，只概述已记录的授课主题；不要凭空添加教学环节。',
      '',
      '课堂表现与上课情况：',
      '- “课堂反馈”段只结合老师输入里确实记录的个人细节。没有个人观察时如实说明，绝不虚构答题、听讲、练习或状态变化。',
      '- 知识点可客观解释；课堂发生的事实只能来自老师输入。不同学生的观察不可互相挪用。',
      '',
      '学生与档位：',
      '- 如果【已确认学生】不为空，直接围绕这些学生写，老师输入没提名字也不要拒绝。',
      '- 为每个已确认学生单独写反馈，只出现该学生本人姓名；即使表现档位相同，不同学生也必须根据各自输入调整切入点、问题和建议，不能复制同一模板。',
      '- 称呼铁律：每份评语正文的第一处称呼必须使用该学生的真实姓名加“同学”（例如“王小明同学”），全篇只出现该学生姓名；严禁使用“孩子”“孩子同学”“这位同学”“该同学”“宝贝”“小朋友”等泛指称呼，也严禁在姓名后重复出现“同学孩子”之类的叠词。',
      '- 你会收到每个学生的表现档位（积极 / 一般 / 需提升），每份反馈的基调和细节随档位不同：',
      '  - 积极：具体说出好在哪（结合知识点和课堂细节），并给一个“再进一步”的方向；',
      '  - 一般：客观描述当堂状态，指出一个明确的小改进点；',
      '  - 需提升：委婉但不回避地点出问题，并给家长一条可在家配合的具体建议。',
      '- 如果老师输入里既有表扬又有问题，两者都要写进去，问题放在表扬之后、建议之前。',
      '- 严禁给不同学生写雷同或模板化内容，每段的切入点、措辞、举例都要不同。',
      '- 必须结合【学科】调整观察重点：数学关注运算准确性、步骤规范和解题思路；英语关注词汇、语法、阅读与表达；物理关注模型理解、公式应用、实验现象和推理过程；其他学科围绕该学科真实学习任务展开。不得把其他学科的术语套入当前反馈。',
      '- overallComment 和每个 perStudentComments.comment 都必须严格按以下三段输出，每个标题单独一行且顺序固定：本节课学习内容：、课堂反馈：、孩子掌握情况：。结论与老师记录一致，不能凭档位编具体事件。',
      '- mood、tags、knowledgePoints 只能从提供的可选项里选；提到作业才填 homework。',
      '只输出 JSON，不要 Markdown，不要任何解释。',
    ].join('\n')

    const user = [
      `【老师输入】${note}`,
      body.grade ? `【年级】${String(body.grade).slice(0, 80)}` : '',
      body.subject ? `【学科】${String(body.subject).slice(0, 80)}` : '',
      body.course ? `【课程】${String(body.course).slice(0, 120)}` : '',
      performanceTags.length ? `【课堂表现】${performanceTags.join('、')}` : '',
      masteryLevel ? `【知识掌握】${masteryLevel}` : '',
      teacherRemark ? `【教师补充】${teacherRemark}` : '',
      confirmedStudentText,
      perfGroups ? `【表现档位】${perfGroups}` : '',
      promptRoster.length ? `【班级学生】${promptRoster.map((s) => `${s.name}(${s.id})`).join('、')}` : '【班级学生】无',
      moods.length ? `【可选状态】${moods.map((m) => `${m.value}=${m.label}`).join(' / ')}` : '',
      tagOptions.length ? `【可选标签】${tagOptions.join('、')}` : '',
      kpOptions.length ? `【可选知识点】${kpOptions.join('、')}` : '',
      `【主要意图】${detectedIntent}`,
      `【当前表单】状态=${currentForm.mood || '未选'}；已有评语=${currentForm.overallComment || '空'}；已有建议=${currentForm.suggestion || currentForm.summary || '空'}；已有寄语=${currentForm.stageSummaryText || '空'}`,
      stageMaterial ? `【阶段素材】${stageMaterial.slice(0, 800)}` : '',
      '【返回 JSON】',
      '{"intent":"classroom|stage|suggestion|mixed","mood":"GREAT|GOOD|OKAY|NEEDS_ATTENTION","overallComment":"包含本节课学习内容、课堂反馈、孩子掌握情况三部分的反馈","perStudentComments":[{"studentId":"已确认学生id","studentName":"已确认学生姓名","comment":"该学生专属的三部分反馈"}],"tags":["从可选标签中选"],"knowledgePoints":["从可选知识点中选"],"homework":["作业内容"],"summary":"","suggestion":"下一步建议","stageSummaryText":"阶段寄语","stageSuggestions":"阶段建议"}',
    ].filter(Boolean).join('\n')

    try {
      const n = Math.max(resolved.matchedIds.length, 1)
      const maxTokens = Math.min(700 + n * 280, 2400)
      const raw = await callPrimaryAI({ system: sys, user, maxTokens, temperature: 0.5, jsonMode: true })
      const parsed = parseAIJson(raw)
      if (!parsed) return NextResponse.json(buildFallbackResponse({ note, intent: detectedIntent, resolved, kpOptions, tagOptions, raw, appendQuote: body.appendQuote }))

      const validMoods = moods.map((m) => m.value)
      const matchTag = (tag: string) => tagOptions.find((option) => option === tag || option.includes(tag) || tag.includes(option))
      const matchKnowledgePoint = (knowledgePoint: string) => kpOptions.find((option) => option === knowledgePoint || option.includes(knowledgePoint) || knowledgePoint.includes(option))
      const parsedMood = typeof parsed.mood === 'string' ? parsed.mood : inferMoodFromNote(note)
      const structureContext = { performanceTags, masteryLevel, teacherRemark }
      const parsedOverallComment = typeof parsed.overallComment === 'string'
        ? ensureStructuredFeedback(parsed.overallComment, structureContext)
        : ''
      const perStudentComments = buildPerStudentComments(note, resolved, parsed.perStudentComments, parsedOverallComment, body.appendQuote)
        .map((item) => ({ ...item, comment: ensureStructuredFeedback(item.comment, structureContext) }))
      const result = {
        intent: typeof parsed.intent === 'string' ? parsed.intent : detectedIntent,
        studentIds: resolved.matchedIds,
        studentNames: resolved.matchedNames,
        unknownNames: resolved.unknownNames,
        needsManualStudentSelection: resolved.needsManual,
        mood: validMoods.includes(parsedMood) ? parsedMood : inferMoodFromNote(note),
        overallComment: parsedOverallComment,
        perStudentComments,
        similarityWarnings: findSimilarComments(perStudentComments.map((item) => ({ ...item, comment: articleSections(item.comment)?.[1] || item.comment })), 0.55),
        tags: stringArray(parsed.tags).map(matchTag).filter((tag): tag is string => !!tag).slice(0, 4),
        knowledgePoints: stringArray(parsed.knowledgePoints).map(matchKnowledgePoint).filter((knowledgePoint): knowledgePoint is string => !!knowledgePoint).slice(0, 4),
        homework: stringArray(parsed.homework),
        summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
        suggestion: typeof parsed.suggestion === 'string' ? parsed.suggestion.trim() : '',
        stageSummaryText: typeof parsed.stageSummaryText === 'string' ? parsed.stageSummaryText.trim() : '',
        stageSuggestions: typeof parsed.stageSuggestions === 'string' ? parsed.stageSuggestions.trim() : '',
      }

      const hasContent = Boolean(
        result.overallComment || result.perStudentComments.length || result.suggestion || result.summary || result.stageSummaryText || result.stageSuggestions ||
        result.tags.length || result.knowledgePoints.length || result.homework.length
      )
      return NextResponse.json(hasContent ? result : buildFallbackResponse({ note, intent: detectedIntent, resolved, kpOptions, tagOptions, raw, appendQuote: body.appendQuote }))
    } catch (error) {
      console.error('[ai-feedback smart]', error)
      return NextResponse.json(buildFallbackResponse({ note, intent: detectedIntent, resolved, kpOptions, tagOptions, appendQuote: body.appendQuote }))
    }
  }

  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const kind = body.kind === 'stage' ? 'stage' : 'feedback'
  if (!studentId) return NextResponse.json({ error: '请输入描述内容' }, { status: 400 })

  const owned = await assertTeacherOwnsStudent(teacher.id, studentId, prisma)
  if (!owned) return NextResponse.json({ error: '你无权为这名学员生成反馈' }, { status: 403 })

  const to = new Date(); const from = new Date(to); from.setMonth(from.getMonth() - 2)
  const p = await getStudentProfile(prisma, studentId, { from, to })
  if (!p) return NextResponse.json({ error: '未找到学员数据' }, { status: 404 })

  const keywords = (typeof body.keywords === 'string' && body.keywords.trim()) || ''
  const subjects = p.record.trendBySubject.map((t) => t.subject).filter(Boolean)
  const uniqueSubjects = [...new Set(subjects.length ? subjects : [])]
  const facts: string[] = [
    `学生：${p.identity.name}（${p.identity.grade ?? '未知年级'}）`,
    `科目：${uniqueSubjects.length ? uniqueSubjects.join('、') : '暂无科目记录'}`,
  ]
  if (p.overview.attendanceRate !== null) facts.push(`出勤率：${p.overview.attendanceRate}%`)
  facts.push(`掌握率：${p.study.mastery.masteredPct}%（共${p.study.mastery.total}题，复习${p.study.mastery.reviewPct}%，薄弱${p.study.mastery.weakPct}%）`)
  if (p.study.weaknesses.length) facts.push(`薄弱点：${p.study.weaknesses.slice(0, 4).map((w) => `${w.topic}（错${w.mistakeCount}次）`).join('、')}`)
  if (p.habits.homeworkDoneRate !== null) facts.push(`作业完成率：${p.habits.homeworkDoneRate}%`)
  if (p.habits.inClassAvg !== null) facts.push(`课堂表现均分：${p.habits.inClassAvg}/5`)

  const sysPrompt = kind === 'stage'
    ? "你是老师，给家长写阶段小结。像老师当面跟家长说话，先具体表现、再注意点、最后一条家长可配合的建议，120~180字，不用'该生'，不编造数据之外的内容。只输出正文。"
    : "你是老师，给家长写课堂反馈。像老师当面跟家长说话，先具体表现、再注意点、最后一条家长可配合的建议，120~180字，不用'该生'，不编造数据之外的内容。只输出正文。"
  const userPrompt = ['【真实数据，严禁编造】', facts.join('\n'), keywords ? `【关键词】${keywords}` : '', '要求：称呼名字+同学，不用“该生”，肯定进步、说明现状、给下一步建议。'].filter(Boolean).join('\n')

  try {
    const text = await callDeepSeek({ system: sysPrompt, user: userPrompt, maxTokens: 350 })
    return NextResponse.json({ draft: (text || '').trim() })
  } catch (error) {
    if (error instanceof AIProviderError) return NextResponse.json({ error: 'AI 服务暂不可用' }, { status: 502 })
    return NextResponse.json({ error: 'AI 生成失败' }, { status: 500 })
  }
})
