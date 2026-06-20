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
  if (bucket && now < bucket.resetAt && bucket.count >= 8) {
    return false
  }
  if (!bucket || now >= bucket.resetAt) {
    aiRateBucket.set(teacherId, { count: 1, resetAt: now + 60_000 })
  } else {
    bucket.count += 1
  }
  if (aiRateBucket.size > 500) {
    for (const [k, v] of aiRateBucket) {
      if (now >= v.resetAt) aiRateBucket.delete(k)
    }
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
  const t = note
  if (/教师寄语|本期寄语|阶段小结|学情小结|阶段报告|学期总结/.test(t)) return 'stage'
  if (/下一步建议|建议|接下来|后续/.test(t)) return 'suggestion'
  return 'classroom'
}

const UNIFIED_JSON_SPEC = [
  '{',
  '  "intent": "classroom" | "stage" | "suggestion" | "mixed",',
  '  "studentNames": ["从描述中识别到的学生姓名"],',
  '  "mood": "从可选课堂状态中选一个 value，没有填 GOOD",',
  '  "overallComment": "面向家长的评语，50-80字，只依据描述/事实，不编造",',
  '  "tags": ["从可选标签中选，最多4个，没有空数组"],',
  '  "knowledgePoints": ["从可选知识点中选，没有空数组"],',
  '  "homework": ["从描述中提取的作业，一项一条，没有空数组"],',
  '  "summary": "课堂小结，一句话",',
  '  "suggestion": "下一步建议，一句话",',
  '  "stageSummaryText": "面向家长的阶段寄语，80-120字，有数据时基于数据，无数据时依据描述",',
  '  "stageSuggestions": "阶段建议，一句话"',
  '}',
]

export const POST = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()

  if (!checkTeacherAILimit(teacher.id)) {
    return NextResponse.json({ error: 'AI 生成请求过于频繁，请 1 分钟后再试' }, { status: 429 })
  }

  const body = await req.json() as {
    studentId?: string; keywords?: string; kind?: 'feedback' | 'stage'
    mode?: 'classroom'; note?: string
    roster?: Array<{ id: string; name: string }>
    options?: { moods?: Array<{ value: string; label: string }>; tags?: string[]; knowledgePoints?: string[] }
    selected?: { mood?: string; tags?: string[]; knowledgePoints?: string[] }
    selectedStudentIds?: string[]
    stageMaterial?: string
  }

  const note = (typeof body.note === 'string' && body.note.trim()) || ''

  // ── Unified smart feedback mode (default) ──
  if (!body.studentId || body.mode === 'classroom' || note) {
    if (!note) {
      // Fall through to stage/feedback mode for single-student with keywords
      if (body.studentId && !body.mode) {
        // Continue below
      } else {
        return NextResponse.json({ error: '请输入描述内容' }, { status: 400 })
      }
    }
  }

  // ── Smart unified path (when note is provided) ──
  if (note) {
    const roster = Array.isArray(body.roster) ? body.roster : []
    const rosterNames = roster.map((s) => s.name)
    const options = body.options || {}
    const moods = Array.isArray(options.moods) ? options.moods : []
    const tagOptions = Array.isArray(options.tags) ? options.tags : []
    const kpOptions = Array.isArray(options.knowledgePoints) ? options.knowledgePoints : []
    const selected = body.selected || {}
    const selectedStudentIds = Array.isArray(body.selectedStudentIds) ? body.selectedStudentIds : []
    const stageMaterial = typeof body.stageMaterial === 'string' ? body.stageMaterial : ''
    const detectedIntent = detectIntent(note)

    const sys = '你是课外辅导老师助理，把老师的口语描述整理成结构化课堂反馈。只输出 JSON，不要多余文字。面向家长，语气温暖、具体、简洁。不编造分数/排名/考试/未提及事件。'
    const user = [
      `【老师的描述】${note}`,
      '',
      ...(rosterNames.length ? [
        `【班级学员名单（只能从中选择）】${rosterNames.join('、')}`,
      ] : []),
      ...(selectedStudentIds.length ? [
        `【老师已选学生ID】${selectedStudentIds.join(', ')}（若老师描述中未提姓名，可使用已选学生）`,
      ] : []),
      ...(moods.length ? [
        `【可选课堂状态】${moods.map((m) => `${m.value}=${m.label}`).join(' / ')}`,
      ] : []),
      ...(tagOptions.length ? [
        `【可选表现标签】${tagOptions.join('、')}`,
      ] : []),
      ...(kpOptions.length ? [
        `【可选知识点】${kpOptions.join('、')}`,
      ] : []),
      '',
      `【检测到的意图】${detectedIntent}（可调整）`,
      `【老师已选】课堂状态=${selected.mood || '未选'}，标签=${selected.tags?.join('、') || '无'}，知识点=${selected.knowledgePoints?.join('、') || '无'}`,
      ...(stageMaterial ? [
        '',
        `【阶段数据参考（仅供 stageSummaryText 参考，无数据则不要编数字）】`,
        stageMaterial.slice(0, 800),
      ] : []),
      '',
      '【请输出以下 JSON（只输出 JSON，不要 ``` 包裹，不要解释）】：',
      ...UNIFIED_JSON_SPEC,
      '',
      '【硬约束】',
      '- 只能输出 JSON，不要 ``` 包裹，不要解释',
      '- studentNames 只能取班级学员名单中的姓名；若未识别且已选学生非空，studentNames 可为空数组（前端会用已选ID）',
      '- tags/knowledgePoints 只能从给定列表中选',
      '- stageSummaryText：当 intent=stage 时生成 80-120 字阶段小结；有阶段数据时基于数据，无数据时依据老师描述；不要编数字',
      '- suggestion/stageSuggestions：简短一句话',
      '- 不要编造分数、排名、考试成绩',
    ].join('\n')

    try {
      const raw = await callDeepSeek({ system: sys, user, maxTokens: 600, jsonMode: true })
      const parsed = parseAIJson(raw)
      if (!parsed || typeof parsed !== 'object') {
        console.error('[ai-feedback smart] parse failed, raw:', raw.slice(0, 300))
        return NextResponse.json({
          error: 'AI 没有返回可用内容，请换一句更具体的描述，例如：马紫晨本节课积极回答问题，作业完成认真。',
        }, { status: 500 })
      }

      // Student name matching
      const validatedNames: string[] = []
      const unknownNames: string[] = []
      const parsedNames: string[] = Array.isArray(parsed.studentNames) ? parsed.studentNames : []
      for (const name of parsedNames) {
        if (typeof name !== 'string') continue
        const match = roster.find((s) => s.name === name.trim())
          || roster.find((s) => s.name.includes(name.trim()) || name.trim().includes(s.name))
        if (match) {
          if (!validatedNames.includes(match.id)) validatedNames.push(match.id)
        } else {
          unknownNames.push(name.trim())
        }
      }
      // Fallback to selectedStudentIds if no names matched
      const finalStudentIds = validatedNames.length ? validatedNames : selectedStudentIds

      // Validate mood
      const validMoodValues = moods.map((m) => m.value)
      const mood = validMoodValues.includes(parsed.mood) ? parsed.mood : 'GOOD'

      // Filter to whitelist
      const aiTags: string[] = (Array.isArray(parsed.tags) ? parsed.tags : [])
        .filter((t: unknown) => typeof t === 'string' && tagOptions.includes(t as string))
        .slice(0, 4)
      const aiKps: string[] = (Array.isArray(parsed.knowledgePoints) ? parsed.knowledgePoints : [])
        .filter((k: unknown) => typeof k === 'string' && kpOptions.includes(k as string))
      const homework: string[] = (Array.isArray(parsed.homework) ? parsed.homework : [])
        .filter((h: unknown) => typeof h === 'string' && (h as string).trim())
        .map((h: string) => h.trim())

      return NextResponse.json({
        intent: parsed.intent || detectedIntent,
        studentIds: finalStudentIds,
        studentNames: parsedNames,
        unknownNames: unknownNames.length ? unknownNames : undefined,
        mood,
        overallComment: typeof parsed.overallComment === 'string' ? parsed.overallComment.trim() : '',
        tags: aiTags,
        knowledgePoints: aiKps,
        homework,
        summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
        suggestion: typeof parsed.suggestion === 'string' ? parsed.suggestion.trim() : '',
        stageSummaryText: typeof parsed.stageSummaryText === 'string' ? parsed.stageSummaryText.trim() : '',
        stageSuggestions: typeof parsed.stageSuggestions === 'string' ? parsed.stageSuggestions.trim() : '',
      })
    } catch (error) {
      console.error('[ai-feedback smart]', error)
      if (error instanceof AIProviderError) {
        return NextResponse.json({ error: 'AI 服务暂时不可用，请稍后重试' }, { status: 502 })
      }
      return NextResponse.json({ error: 'AI 生成失败，请稍后重试' }, { status: 500 })
    }
  }

  // ── Legacy stage/feedback mode: real data → prose draft (for workbench) ──
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const kind = body.kind === 'stage' ? 'stage' : 'feedback'

  if (!studentId) {
    return NextResponse.json({ error: '缺少 studentId' }, { status: 400 })
  }

  const owned = await assertTeacherOwnsStudent(teacher.id, studentId, prisma)
  if (!owned) {
    return NextResponse.json({ error: '你无权为这名学员生成反馈' }, { status: 403 })
  }

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
  if (p.overview.attendanceRate !== null) facts.push(`本阶段出勤率：${p.overview.attendanceRate}%`)
  facts.push(`逐题掌握率：${p.study.mastery.masteredPct}%（共 ${p.study.mastery.total} 题，需复习 ${p.study.mastery.reviewPct}%，薄弱 ${p.study.mastery.weakPct}%）`)
  if (p.study.weaknesses.length) {
    facts.push(`薄弱知识点：${p.study.weaknesses.slice(0, 4).map((w) => `${w.topic}（错 ${w.mistakeCount} 次）`).join('、')}`)
  }
  if (p.habits.homeworkDoneRate !== null) facts.push(`作业完成率：${p.habits.homeworkDoneRate}%`)
  if (p.habits.inClassAvg !== null) facts.push(`课堂表现均分：${p.habits.inClassAvg}/5`)
  if (p.record.trendBySubject.length) {
    const trends = p.record.trendBySubject.map((t) => { const latest = t.points.at(-1); return latest ? `${t.subject} ${latest.name} ${latest.pct}%` : null }).filter(Boolean).slice(0, 4)
    if (trends.length) facts.push(`近期成绩趋势：${trends.join('；')}`)
  }
  const highlights = p.record.timeline.filter((item) => ['feedback', 'badge', 'post'].includes(item.type)).slice(0, 3)
  if (highlights.length) facts.push(`近期亮点：${highlights.map((h) => h.title).join('；')}`)

  const sysPrompt = kind === 'stage'
    ? '你是老师，给家长写阶段小结（~100字）。温暖具体，基于数据给方向。只输出正文。'
    : '你是老师，给家长写课堂反馈（~100字）。温暖具体，基于事实。只输出正文。'

  const userPrompt = [
    '【真实数据，只能依据这些，严禁编造】', facts.join('\n'), '',
    keywords ? `【关键词】${keywords}` : '', '',
    '要求：~100字，家长口吻，肯定进步→客观现状→下一步建议，无"AI"字样，只输出正文。',
  ].join('\n')

  try {
    const text = await callDeepSeek({ system: sysPrompt, user: userPrompt, maxTokens: 350 })
    return NextResponse.json({ draft: (text || '').trim() })
  } catch (error) {
    if (error instanceof AIProviderError) return NextResponse.json({ error: 'AI 服务暂不可用' }, { status: 502 })
    return NextResponse.json({ error: 'AI 生成失败' }, { status: 500 })
  }
})
