import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher, assertTeacherOwnsStudent } from '@/lib/teacher-portal'
import { getStudentProfile } from '@/lib/student-profile'
import { callDeepSeek, AIProviderError } from '@/lib/ai/client'

export const dynamic = 'force-dynamic'

const aiRateBucket = new Map<string, { count: number; resetAt: number }>()

function checkTeacherAILimit(teacherId: string) {
  const now = Date.now()
  const bucket = aiRateBucket.get(teacherId)
  if (bucket && now < bucket.resetAt && bucket.count >= 8) return false
  if (!bucket || now >= bucket.resetAt) {
    aiRateBucket.set(teacherId, { count: 1, resetAt: now + 60_000 })
  } else {
    bucket.count += 1
  }
  if (aiRateBucket.size > 500) {
    for (const [k, v] of aiRateBucket) { if (now >= v.resetAt) aiRateBucket.delete(k) }
  }
  return true
}

function parseAIJson(raw: string): any | null {
  let s = (raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a !== -1 && b !== -1 && b > a) s = s.slice(a, b + 1)
  try { return JSON.parse(s) } catch { return null }
}

function detectIntent(note: string): 'stage' | 'suggestion' | 'classroom' {
  if (/教师寄语|本期寄语|阶段小结|学情小结|阶段报告|学期总结|生成寄语|写寄语|写个寄语|写一段寄语|生成一段寄语/.test(note)) return 'stage'
  if (/下一步建议|写建议|生成建议|接下来|后续建议|给个建议/.test(note)) return 'suggestion'
  return 'classroom'
}

// ── Local fuzzy student resolution ──
interface RosterEntry { id: string; name: string }

function resolveStudentsFromContext(params: {
  note: string
  roster: RosterEntry[]
  selectedStudentIds: string[]
}): { matchedIds: string[]; matchedNames: string[]; unknownNames: string[]; needsManual: boolean } {
  const { note, roster, selectedStudentIds } = params

  // Priority 1: teacher already selected students → use them directly
  if (selectedStudentIds.length > 0) {
    const names = selectedStudentIds
      .map((id) => roster.find((s) => s.id === id)?.name)
      .filter(Boolean) as string[]
    return { matchedIds: selectedStudentIds, matchedNames: names, unknownNames: [], needsManual: false }
  }

  // Priority 2: try to match from roster using note text
  const cleanNote = note.replace(/同学|老师说|今天|本节课|课堂|表现|作业|很|非常|比较/g, '').trim()
  const matchedIds: string[] = []
  const matchedNames: string[] = []
  const unknownNames: string[] = []

  // Extract potential name fragments from note
  const nameHints: string[] = []
  // "赵亦昊同学" → "赵亦昊"
  const surnameStudentRe = /([一-龥]{1,2})(同学)/g
  let m
  while ((m = surnameStudentRe.exec(note)) !== null) { nameHints.push(m[1]) }
  // "小赵" → "赵"
  const nickRe = /小([一-龥])/g
  while ((m = nickRe.exec(note)) !== null) { nameHints.push(m[1]) }

  for (const hint of nameHints) {
    // Try exact match first
    let found = roster.find((s) => s.name === hint)
    if (!found && hint.length === 1) {
      // Surname only: find students with that surname
      const matches = roster.filter((s) => s.name.startsWith(hint))
      if (matches.length === 1) found = matches[0]
      else if (matches.length > 1) {
        unknownNames.push(hint + '（多位' + hint + '姓同学）')
        continue
      }
    }
    // Partial name match
    if (!found && hint.length >= 2) {
      const partials = roster.filter((s) => s.name.includes(hint))
      if (partials.length === 1) found = partials[0]
      else if (partials.length > 1) {
        unknownNames.push(hint + '（不确定是哪位）')
        continue
      }
    }
    if (found && !matchedIds.includes(found.id)) {
      matchedIds.push(found.id)
      matchedNames.push(found.name)
    } else if (!found) {
      unknownNames.push(hint)
    }
  }

  // Substring check: try matching long substrings of note against roster names
  if (!matchedIds.length) {
    for (const s of roster) {
      if (s.name.length >= 2 && (note.includes(s.name) || cleanNote.includes(s.name.slice(1)))) {
        matchedIds.push(s.id)
        matchedNames.push(s.name)
        break
      }
    }
  }

  const needsManual = matchedIds.length === 0
  return { matchedIds, matchedNames, unknownNames, needsManual }
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
    options?: { moods?: Array<{ value: string; label: string }>; tags?: string[]; knowledgePoints?: string[] }
    selected?: { mood?: string; tags?: string[]; knowledgePoints?: string[] }
    selectedStudentIds?: string[]
    stageMaterial?: string
    lessonId?: string; groupId?: string; courseType?: string
    currentForm?: { mood?: string; overallComment?: string; tags?: string[]; knowledgePoints?: string[]; homework?: string[]; summary?: string; suggestion?: string; stageSummaryText?: string; stageSuggestions?: string }
  }

  const note = (typeof body.note === 'string' && body.note.trim()) || ''

  if (!note) {
    // Fall through to legacy stage/feedback mode (single-student + keywords)
    const sid = typeof body.studentId === 'string' ? body.studentId : ''
    if (!sid) return NextResponse.json({ error: '请输入描述内容' }, { status: 400 })
    // proceed to legacy mode below
  }

  // ── Smart unified path ──
  if (note) {
    const roster = Array.isArray(body.roster) ? body.roster : []
    const selectedStudentIds = Array.isArray(body.selectedStudentIds) ? body.selectedStudentIds : []
    const resolved = resolveStudentsFromContext({ note, roster, selectedStudentIds })
    const selected = body.selected || {}
    const currentForm = body.currentForm || {}

    // Build resolved student info for the prompt
    let studentContext = ''
    if (resolved.matchedIds.length > 0) {
      studentContext = `【已确认的学生】${resolved.matchedNames.join('、')}（ID: ${resolved.matchedIds.join(', ')}）—— 请围绕以上学生生成反馈，不要尝试识别其他学生。`
    } else if (roster.length > 0) {
      studentContext = `【班级学员（可从中识别）】${roster.map((s) => s.name).join('、')}\n→ 注意：老师可能用简称（如"紫晨"→"马紫晨"）、昵称（"小马"→姓马的同学）。若无法唯一确认，不要强行匹配。`
    }

    const options = body.options || {}
    const moods = Array.isArray(options.moods) ? options.moods : []
    const tagOptions = Array.isArray(options.tags) ? options.tags : []
    const kpOptions = Array.isArray(options.knowledgePoints) ? options.knowledgePoints : []
    const stageMaterial = typeof body.stageMaterial === 'string' ? body.stageMaterial : ''
    const detectedIntent = detectIntent(note)

    const sys = [
      '你是课外辅导老师助理。根据老师给出的上下文生成结构化课堂反馈。',
      '【写作铁律】',
      '- 面向家长，称呼孩子名字+"同学"，绝对不要用"该生""该同学"',
      '- 语气像老师课后和家长聊天——温暖、具体、真实',
      '- 肯定进步，也温和指出方向，不夸张不空洞',
      '- 禁止编造：分数、排名、考试成绩、未提及的事件',
      '- 评语要有血肉，不要写成"表现良好继续加油"',
      '- 示例风格："赵亦昊同学今天课堂上能够主动举手回答问题，说明对知识点有在积极思考。作业方面如果能再认真一点，把会做的题稳定拿住，提升会很明显。"',
      '【输出要求】只输出 JSON，不要 ``` 包裹，不要解释文字。',
    ].join('\n')

    const userParts = [
      `【老师的描述】${note}`,
      '',
      studentContext,
      ...(moods.length ? [`【可选课堂状态】${moods.map((m) => `${m.value}=${m.label}`).join(' / ')}`] : []),
      ...(tagOptions.length ? [`【可选表现标签】${tagOptions.join('、')}`] : []),
      ...(kpOptions.length ? [`【可选知识点】${kpOptions.join('、')}`] : []),
      '',
      `【主要意图】${detectedIntent}`,
      `【当前已选】状态=${selected.mood || '未选'} 标签=${selected.tags?.join('、') || '无'} 知识点=${selected.knowledgePoints?.join('、') || '无'}`,
      `【表单已有内容】评语=${currentForm.overallComment || '空'} 建议=${currentForm.suggestion || '空'} 寄语=${currentForm.stageSummaryText || '空'}`,
      ...(stageMaterial ? ['', '【阶段数据（仅 stageSummaryText 参考，不得编数字）】', stageMaterial.slice(0, 800)] : []),
      '',
      '【JSON 结构（仅输出此 JSON）】',
      '{',
      '  "intent": "classroom|stage|suggestion|mixed",',
      '  "mood": "GREAT|GOOD|OKAY|NEEDS_ATTENTION",',
      '  "overallComment": "50-100字家长评语，自然温暖，用孩子名字",',
      '  "tags": ["从可选标签中选，最多4个"],',
      '  "knowledgePoints": ["从可选知识点中选"],',
      '  "homework": ["作业内容"],',
      '  "suggestion": "下一步建议，一句话",',
      '  "stageSummaryText": "阶段寄语（intent=stage时重点填写）",',
      '  "stageSuggestions": "阶段建议"',
      '}',
      '',
      '【重要】',
      ...(resolved.matchedIds.length
        ? ['- studentContext 中已有确认的学生，请直接围绕他们生成，无需再识别姓名']
        : ['- 若可从描述中确认学生，请从班级学员中匹配；若无法唯一确认，不要强行匹配']),
      '- 以上字段均可单独有值；不要因为某字段为空就拒绝生成',
      '- 不要输出 studentNames / studentIds / needsManualStudentSelection 字段（后端已处理）',
    ]
    const user = userParts.join('\n')

    try {
      const raw = await callDeepSeek({ system: sys, user, maxTokens: 600, jsonMode: true })
      const parsed = parseAIJson(raw)

      // Build response with local resolution + AI content
      const aiMood = parsed?.mood || 'GOOD'
      const validMoods = moods.map((m) => m.value)
      const mood = validMoods.includes(aiMood) ? aiMood : 'GOOD'

      const aiTags: string[] = (Array.isArray(parsed?.tags) ? parsed.tags : [])
        .filter((t: unknown) => typeof t === 'string' && tagOptions.includes(t as string)).slice(0, 4)
      const aiKps: string[] = (Array.isArray(parsed?.knowledgePoints) ? parsed.knowledgePoints : [])
        .filter((k: unknown) => typeof k === 'string' && kpOptions.includes(k as string))
      const homework: string[] = (Array.isArray(parsed?.homework) ? parsed.homework : [])
        .filter((h: unknown) => typeof h === 'string' && (h as string).trim()).map((h: string) => h.trim())

      const result = {
        intent: parsed?.intent || detectedIntent,
        studentIds: resolved.matchedIds,
        studentNames: resolved.matchedNames,
        unknownNames: resolved.unknownNames.length ? resolved.unknownNames : undefined,
        needsManualStudentSelection: resolved.needsManual,
        mood,
        overallComment: typeof parsed?.overallComment === 'string' ? parsed.overallComment.trim() : '',
        tags: aiTags,
        knowledgePoints: aiKps,
        homework,
        summary: typeof parsed?.summary === 'string' ? parsed.summary.trim() : '',
        suggestion: typeof parsed?.suggestion === 'string' ? parsed.suggestion.trim() : '',
        stageSummaryText: typeof parsed?.stageSummaryText === 'string' ? parsed.stageSummaryText.trim() : '',
        stageSuggestions: typeof parsed?.stageSuggestions === 'string' ? parsed.stageSuggestions.trim() : '',
      }

      // Even if JSON parse failed, we still have local resolution → return what we have
      if (!parsed || typeof parsed !== 'object') {
        console.warn('[ai-feedback smart] AI returned unparseable JSON, using local resolution only', raw.slice(0, 200))
        // Still return success with what we have locally
      }

      return NextResponse.json(result)
    } catch (error) {
      console.error('[ai-feedback smart]', error)
      if (error instanceof AIProviderError) {
        return NextResponse.json({ error: 'AI 服务暂时不可用，请稍后重试' }, { status: 502 })
      }
      // Don't return 500 with raw error — return a fallback with manual flag
      return NextResponse.json({
        intent: detectedIntent,
        studentIds: resolved.matchedIds,
        studentNames: resolved.matchedNames,
        needsManualStudentSelection: resolved.matchedIds.length === 0,
        mood: 'GOOD',
        overallComment: '',
        tags: [], knowledgePoints: [], homework: [],
        summary: '', suggestion: '', stageSummaryText: '', stageSuggestions: '',
        unknownNames: resolved.unknownNames.length ? resolved.unknownNames : undefined,
      })
    }
  }

  // ── Legacy stage/feedback mode ──
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const kind = body.kind === 'stage' ? 'stage' : 'feedback'

  if (!studentId) return NextResponse.json({ error: '缺少 studentId' }, { status: 400 })

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
  if (p.record.trendBySubject.length) {
    const trends = p.record.trendBySubject.map((t) => { const l = t.points.at(-1); return l ? `${t.subject} ${l.name} ${l.pct}%` : null }).filter(Boolean).slice(0, 4)
    if (trends.length) facts.push(`近期成绩：${trends.join('；')}`)
  }
  const highlights = p.record.timeline.filter((item) => ['feedback', 'badge', 'post'].includes(item.type)).slice(0, 3)
  if (highlights.length) facts.push(`近期亮点：${highlights.map((h) => h.title).join('；')}`)

  const sysPrompt = kind === 'stage'
    ? '你是老师，给家长写阶段小结（~100字）。温暖具体，基于数据给方向。只输出正文。'
    : '你是老师，给家长写课堂反馈（~100字）。温暖具体，基于事实。只输出正文。'

  const userPrompt = [
    '【真实数据，严禁编造】', facts.join('\n'), '',
    keywords ? `【关键词】${keywords}` : '', '',
    '要求：~100字，家长口吻，称呼名字+同学，不用"该生"，肯定进步→客观现状→下一步建议，只输出正文。',
  ].join('\n')

  try {
    const text = await callDeepSeek({ system: sysPrompt, user: userPrompt, maxTokens: 350 })
    return NextResponse.json({ draft: (text || '').trim() })
  } catch (error) {
    if (error instanceof AIProviderError) return NextResponse.json({ error: 'AI 服务暂不可用' }, { status: 502 })
    return NextResponse.json({ error: 'AI 生成失败' }, { status: 500 })
  }
})
