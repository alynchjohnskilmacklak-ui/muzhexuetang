import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher, assertTeacherOwnsStudent } from '@/lib/teacher-portal'
import { getStudentProfile } from '@/lib/student-profile'
import { callDeepSeek, AIProviderError } from '@/lib/ai/client'

export const dynamic = 'force-dynamic'

const aiRateBucket = new Map<string, { count: number; resetAt: number }>()

type Mood = 'GREAT' | 'GOOD' | 'OKAY' | 'NEEDS_ATTENTION'
type Intent = 'stage' | 'suggestion' | 'classroom'
type AIJson = Record<string, unknown>
interface RosterEntry { id: string; name: string }
interface SelectedStudent { id: string; name?: string | null }
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

function detectIntent(note: string): Intent {
  if (/教师寄语|本期寄语|阶段小结|学情小结|阶段报告|学期总结|生成寄语|写个寄语|写一段评语|帮我生成教师评语|帮我补齐评语/.test(note)) return 'stage'
  if (/下一步建议|写建议|生成建议|接下来|后续建议|给个建议/.test(note)) return 'suggestion'
  return 'classroom'
}

function inferMoodFromNote(note: string): Mood {
  if (/走神|不认真|没完成|没有完成|需要加强|拖拉|粗心|不仔细|不稳定/.test(note)) return 'OKAY'
  if (/非常好|很好|主动|进步明显|特别积极|状态很好/.test(note)) return 'GREAT'
  if (/积极|认真|不错|进步|稳定|听讲/.test(note)) return 'GOOD'
  return 'GOOD'
}

function inferTagsFromNote(note: string): string[] {
  const tags: string[] = []
  const add = (tag: string) => { if (!tags.includes(tag)) tags.push(tag) }
  if (/认真|听讲|专注/.test(note)) add('认真听讲')
  if (/积极|主动|回答/.test(note)) add('积极回答')
  if (/进步|提升/.test(note)) add('有进步')
  if (/作业.*(不好|没完成|没有完成|需要|拖拉)|没完成.*作业/.test(note)) add('作业需加强')
  if (/计算|准确率/.test(note)) add('计算能力')
  if (/审题|不仔细|粗心/.test(note)) add('审题需加强')
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
  const names = studentNames.length ? studentNames : ['孩子']
  const subject = names.length === 1 ? `${names[0]}同学` : `${names.join('、')}几位同学`
  if (/帮我补齐|写得自然|补齐评语|生成反馈/.test(note)) {
    return `${subject}本节课整体学习状态比较稳定，能够跟着课堂节奏完成主要学习任务。后续建议继续把课堂上的理解落实到课后练习中，遇到不确定的地方及时标记并订正，这样进步会更扎实。`
  }
  if (/作业.*(不好|没完成|没有完成|需要|拖拉)|没完成.*作业/.test(note)) {
    return `${subject}今天课堂上能够跟着老师的节奏听讲，说明课堂注意力和理解状态是在线的。不过从作业完成情况来看，课后落实还需要继续加强。建议接下来先保证作业按时、独立完成，再逐步提高正确率。`
  }
  if (/审题|粗心|不仔细/.test(note)) {
    return `${subject}今天在课堂学习中能看出有思考和参与，基础计算也在逐步稳定。需要提醒的是，做题时审题还要再细一些，先看清条件和问题，再下笔计算，会更容易减少不必要的失误。`
  }
  if (/计算|准确率/.test(note)) {
    return `${subject}今天在计算相关内容上有进步，课堂上能跟着老师的思路完成练习。接下来建议继续保持练习量，同时做完后主动检查关键步骤，让准确率更加稳定。`
  }
  if (/走神|专注|不认真/.test(note)) {
    return `${subject}今天课堂中偶尔会出现注意力不够集中的情况，但在老师提醒后能够回到学习节奏。接下来希望先把课堂专注度稳定住，跟紧每一步讲解，课后巩固效果也会更好。`
  }
  if (/积极|主动|认真|不错|进步|听讲/.test(note)) {
    return `${subject}今天课堂状态不错，能够认真听讲并积极参与互动，说明对本节课内容有在主动思考。接下来继续保持这种课堂投入度，课后再及时复盘巩固，学习效果会更稳定。`
  }
  return `${subject}本节课整体表现比较平稳，能够完成课堂中的主要学习任务。接下来建议继续跟紧课堂节奏，课后及时复盘和订正，把当天学到的内容真正沉淀下来。`
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
  allStudentNames: string[]
  note: string
  index: number
  usedQuotes: Set<string>
}): string {
  const { studentName, allStudentNames, note, index, usedQuotes } = params
  let comment = params.comment.trim() || buildFallbackComment(note, [studentName])
  for (const otherName of allStudentNames) {
    if (otherName !== studentName && otherName) comment = comment.replaceAll(otherName, studentName)
  }
  if (!comment.includes(studentName)) comment = `${studentName}同学${comment}`
  return appendUniqueQuote(comment.slice(0, 350), index, usedQuotes).slice(0, 400)
}

function buildPerStudentComments(
  note: string,
  resolved: ReturnType<typeof resolveStudentsFromContext>,
  source: unknown,
  fallbackOverallComment = '',
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
      || buildFallbackComment(note, [studentName])
    return {
      studentId,
      studentName,
      comment: normalizeStudentComment({
        comment: modelComment,
        studentName,
        allStudentNames: resolved.matchedNames,
        note,
        index,
        usedQuotes,
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
    for (const student of roster) {
      const name = student.name || ''
      if (name.length >= 2 && note.includes(name.slice(1)) && !matchedIds.includes(student.id)) {
        matchedIds.push(student.id)
        matchedNames.push(student.name)
        break
      }
    }
  }

  return { matchedIds, matchedNames, unknownNames, needsManual: matchedIds.length === 0 }
}

function buildFallbackResponse(opts: {
  note: string
  intent: Intent
  resolved: ReturnType<typeof resolveStudentsFromContext>
  kpOptions: string[]
  raw?: string
}) {
  const { note, intent, resolved, kpOptions, raw } = opts
  const rawComment = raw ? cleanRawText(raw) : ''
  const comment = rawComment || buildFallbackComment(note, resolved.matchedNames)
  const suggestion = buildFallbackSuggestion(note)
  return {
    intent,
    studentIds: resolved.matchedIds,
    studentNames: resolved.matchedNames,
    unknownNames: resolved.unknownNames,
    needsManualStudentSelection: resolved.matchedIds.length === 0,
    mood: inferMoodFromNote(note),
    overallComment: intent === 'suggestion' ? '' : comment.slice(0, 400),
    perStudentComments: buildPerStudentComments(note, resolved, [], rawComment),
    tags: inferTagsFromNote(note),
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
    stageMaterial?: string
    lessonId?: string; groupId?: string; courseType?: string
    currentForm?: { mood?: string; overallComment?: string; tags?: string[]; knowledgePoints?: string[]; homework?: string[]; summary?: string; suggestion?: string; stageSummaryText?: string; stageSuggestions?: string }
  }

  const note = (typeof body.note === 'string' && body.note.trim()) || ''

  if (note) {
    const roster = Array.isArray(body.roster) ? body.roster.filter((s) => typeof s?.id === 'string') : []
    const selectedStudentIds = Array.isArray(body.selectedStudentIds) ? body.selectedStudentIds.filter((id): id is string => typeof id === 'string') : []
    const selectedStudents = Array.isArray(body.selectedStudents) ? body.selectedStudents.filter((s) => typeof s?.id === 'string') : []
    const resolved = resolveStudentsFromContext({ note, roster, selectedStudentIds, selectedStudents })
    const options = body.options || {}
    const moods = Array.isArray(options.moods) ? options.moods : []
    const tagOptions = Array.isArray(options.tags) ? options.tags : []
    const kpOptions = Array.isArray(options.knowledgePoints) ? options.knowledgePoints : []
    const detectedIntent = detectIntent(note)
    const currentForm = body.currentForm || {}
    const stageMaterial = typeof body.stageMaterial === 'string' ? body.stageMaterial : ''

    const confirmedStudentText = resolved.matchedIds.length
      ? `【已确认学生】${resolved.matchedIds.map((id, index) => `${resolved.matchedNames[index] || '孩子'}(${id})`).join('、')}。这些就是本次反馈对象，老师输入可以不包含学生姓名，必须直接围绕他们生成反馈。`
      : '【已确认学生】无。若能从班级名单和老师描述中唯一识别学生，请匹配；不能唯一识别时仍然生成反馈内容，并标记需要老师手动选择学生。'

    const sys = [
      '你是课外辅导老师的课堂反馈写作助手。你不是关键词提取器，而是要把老师的一句话扩写成完整、自然、家长可读的课堂反馈。',
      '如果【已确认学生】不为空，老师输入可以不包含学生姓名。此时必须直接围绕已确认学生生成反馈，不得因为描述里没有姓名而拒绝。',
      '老师输入常常很短，例如“上课认真听讲，但是作业完成不好”。你的任务是扩写成家长能看懂的完整反馈。',
      '不要机械重复老师原话，要补充成自然、具体、温暖的老师表达。',
      '写作要求：面向家长；使用“学生姓名+同学”；不要使用“该生”“该同学”；不编造分数、排名、考试成绩；不编造老师没说过的具体事件；语气自然。',
      '为【已确认学生】中的每一个学生分别生成一段独立评语，输出到 perStudentComments 数组，每项包含 studentId、studentName、comment。',
      '每段 comment 只能出现该学生本人的姓名，绝不能出现其他同学姓名。内容自然连贯，不加小标题、不列点：先写基于老师输入的今日课堂表现，再给一句可执行的努力方向，最后用「」引用一句适合初中生的学习、坚持或成长类名言。不同学生尽量使用不同名言。',
      '必须尽量完成：mood、overallComment、suggestion、2-4个tags；能判断知识点才填knowledgePoints；提到作业才填homework。',
      '只输出 JSON，不要 Markdown，不要解释。',
    ].join('\n')

    const user = [
      `【老师输入】${note}`,
      confirmedStudentText,
      roster.length ? `【班级学生】${roster.map((s) => `${s.name}(${s.id})`).join('、')}` : '【班级学生】无',
      moods.length ? `【可选状态】${moods.map((m) => `${m.value}=${m.label}`).join(' / ')}` : '',
      tagOptions.length ? `【可选标签】${tagOptions.join('、')}` : '',
      kpOptions.length ? `【可选知识点】${kpOptions.join('、')}` : '',
      `【主要意图】${detectedIntent}`,
      `【当前表单】状态=${currentForm.mood || '未选'}；已有评语=${currentForm.overallComment || '空'}；已有建议=${currentForm.suggestion || currentForm.summary || '空'}；已有寄语=${currentForm.stageSummaryText || '空'}`,
      stageMaterial ? `【阶段素材】${stageMaterial.slice(0, 800)}` : '',
      '【返回 JSON】',
      '{"intent":"classroom|stage|suggestion|mixed","mood":"GREAT|GOOD|OKAY|NEEDS_ATTENTION","overallComment":"兼容旧流程的完整家长反馈","perStudentComments":[{"studentId":"已确认学生id","studentName":"已确认学生姓名","comment":"该生专属三部分评语"}],"tags":["从可选标签中选"],"knowledgePoints":["从可选知识点中选"],"homework":["作业内容"],"summary":"","suggestion":"下一步建议","stageSummaryText":"阶段寄语","stageSuggestions":"阶段建议"}',
    ].filter(Boolean).join('\n')

    try {
      const raw = await callDeepSeek({ system: sys, user, maxTokens: 1800, jsonMode: true })
      const parsed = parseAIJson(raw)
      if (!parsed) return NextResponse.json(buildFallbackResponse({ note, intent: detectedIntent, resolved, kpOptions, raw }))

      const validMoods = moods.map((m) => m.value)
      const parsedMood = typeof parsed.mood === 'string' ? parsed.mood : inferMoodFromNote(note)
      const parsedOverallComment = typeof parsed.overallComment === 'string' ? parsed.overallComment.trim() : ''
      const result = {
        intent: typeof parsed.intent === 'string' ? parsed.intent : detectedIntent,
        studentIds: resolved.matchedIds,
        studentNames: resolved.matchedNames,
        unknownNames: resolved.unknownNames,
        needsManualStudentSelection: resolved.matchedIds.length === 0,
        mood: validMoods.includes(parsedMood) ? parsedMood : inferMoodFromNote(note),
        overallComment: parsedOverallComment,
        perStudentComments: buildPerStudentComments(note, resolved, parsed.perStudentComments, parsedOverallComment),
        tags: stringArray(parsed.tags).filter((t) => tagOptions.includes(t)).slice(0, 4),
        knowledgePoints: stringArray(parsed.knowledgePoints).filter((kp) => kpOptions.includes(kp)),
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
      return NextResponse.json(hasContent ? result : buildFallbackResponse({ note, intent: detectedIntent, resolved, kpOptions, raw }))
    } catch (error) {
      console.error('[ai-feedback smart]', error)
      return NextResponse.json(buildFallbackResponse({ note, intent: detectedIntent, resolved, kpOptions }))
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
    ? '你是老师，给家长写阶段小结（约100字）。温暖具体，基于数据给方向。只输出正文。'
    : '你是老师，给家长写课堂反馈（约100字）。温暖具体，基于事实。只输出正文。'
  const userPrompt = ['【真实数据，严禁编造】', facts.join('\n'), keywords ? `【关键词】${keywords}` : '', '要求：称呼名字+同学，不用“该生”，肯定进步、说明现状、给下一步建议。'].filter(Boolean).join('\n')

  try {
    const text = await callDeepSeek({ system: sysPrompt, user: userPrompt, maxTokens: 350 })
    return NextResponse.json({ draft: (text || '').trim() })
  } catch (error) {
    if (error instanceof AIProviderError) return NextResponse.json({ error: 'AI 服务暂不可用' }, { status: 502 })
    return NextResponse.json({ error: 'AI 生成失败' }, { status: 500 })
  }
})
