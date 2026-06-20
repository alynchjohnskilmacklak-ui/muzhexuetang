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
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

export const POST = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()

  if (!checkTeacherAILimit(teacher.id)) {
    return NextResponse.json({ error: 'AI 生成请求过于频繁，请 1 分钟后再试' }, { status: 429 })
  }

  const body = await req.json() as {
    studentId?: string
    keywords?: string
    kind?: 'feedback' | 'stage'
    mode?: 'classroom'
    note?: string
    roster?: Array<{ id: string; name: string }>
    options?: { moods?: Array<{ value: string; label: string }>; tags?: string[]; knowledgePoints?: string[] }
  }

  // ── Classroom mode: teacher's spoken description → structured JSON ──
  if (body.mode === 'classroom') {
    const note = (typeof body.note === 'string' && body.note.trim()) || ''
    if (!note) {
      return NextResponse.json({ error: '请输入对本节课的一句话描述' }, { status: 400 })
    }

    const roster = Array.isArray(body.roster) ? body.roster : []
    if (!roster.length) {
      return NextResponse.json({ error: '班级学员名单为空' }, { status: 400 })
    }

    const rosterNames = roster.map((s) => s.name)
    const options = body.options || {}
    const moods = Array.isArray(options.moods) ? options.moods : []
    const tagOptions = Array.isArray(options.tags) ? options.tags : []
    const kpOptions = Array.isArray(options.knowledgePoints) ? options.knowledgePoints : []

    const sys = '你是课外辅导老师助理，把老师的口语化课堂描述整理成结构化课堂反馈。只输出 JSON，不要多余文字。'
    const user = [
      `【老师的描述】${note}`,
      '',
      `【班级学员名单（只能从中选择）】${rosterNames.join('、')}`,
      '',
      `【可选课堂状态】${moods.map((m) => `${m.value}=${m.label}`).join(' / ')}`,
      `【可选表现标签】${tagOptions.join('、') || '（无预设）'}`,
      `【可选知识点】${kpOptions.join('、') || '（无预设）'}`,
      '',
      '请输出 JSON（只输出 JSON，不要 ``` 包裹）：',
      '{',
      '  "studentNames": ["从描述中识别到的学生姓名，必须来自班级学员名单，可多个"],',
      '  "mood": "从可选课堂状态中选一个 value，识别不出填 GOOD",',
      '  "overallComment": "面向家长的评语，50-80字，只依据老师描述，不得编造分数/事件",',
      '  "tags": ["从可选表现标签中选，最多4个，没有则空数组"],',
      '  "knowledgePoints": ["从可选知识点中选，没有则空数组"],',
      '  "homework": ["从描述中提取的作业内容，一项一条，没有则空数组"],',
      '  "suggestion": "下一步建议，一句话，可空字符串"',
      '}',
      '',
      '【硬约束】',
      '- studentNames 只能取班级学员名单中的姓名',
      '- tags/knowledgePoints 只能从给定列表中选',
      '- overallComment 只能依据老师描述，不得虚构分数、排名、未提及的事件',
      '- 只输出 JSON 正文，不要 ``` 包裹、不要解释',
    ].join('\n')

    try {
      const raw = await callDeepSeek({ system: sys, user, maxTokens: 500 })
      const parsed = parseAIJson(raw)
      if (!parsed || typeof parsed !== 'object') {
        console.error('[ai-feedback classroom] parse failed, raw:', raw.slice(0, 300))
        return NextResponse.json({ error: 'AI 输出解析失败，请重试' }, { status: 500 })
      }

      // Validate studentNames against roster
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

      // Validate mood against options
      const validMoodValues = moods.map((m) => m.value)
      const mood = validMoodValues.includes(parsed.mood) ? parsed.mood : 'GOOD'

      // Filter tags/kps to whitelist
      const tags: string[] = (Array.isArray(parsed.tags) ? parsed.tags : [])
        .filter((t: unknown) => typeof t === 'string' && tagOptions.includes(t as string))
        .slice(0, 4)
      const kps: string[] = (Array.isArray(parsed.knowledgePoints) ? parsed.knowledgePoints : [])
        .filter((k: unknown) => typeof k === 'string' && kpOptions.includes(k as string))
      const homework: string[] = (Array.isArray(parsed.homework) ? parsed.homework : [])
        .filter((h: unknown) => typeof h === 'string' && (h as string).trim())
        .map((h: string) => h.trim())

      return NextResponse.json({
        studentIds: validatedNames,
        unknownNames: unknownNames.length ? unknownNames : undefined,
        mood,
        overallComment: typeof parsed.overallComment === 'string' ? parsed.overallComment.trim() : '',
        tags,
        knowledgePoints: kps,
        homework,
        suggestion: typeof parsed.suggestion === 'string' ? parsed.suggestion.trim() : '',
      })
    } catch (error) {
      console.error('[ai-feedback classroom]', error)
      if (error instanceof AIProviderError) {
        return NextResponse.json({ error: error.message }, { status: error.status || 500 })
      }
      return NextResponse.json({ error: 'AI 生成失败，请稍后重试' }, { status: 500 })
    }
  }

  // ── Stage/feedback mode: real data → prose draft ──
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const kind = body.kind === 'stage' ? 'stage' : 'feedback'

  if (!studentId) {
    return NextResponse.json({ error: '缺少 studentId' }, { status: 400 })
  }

  const owned = await assertTeacherOwnsStudent(teacher.id, studentId, prisma)
  if (!owned) {
    return NextResponse.json({ error: '你无权为这名学员生成反馈' }, { status: 403 })
  }

  const to = new Date()
  const from = new Date(to)
  from.setMonth(from.getMonth() - 2)

  const p = await getStudentProfile(prisma, studentId, { from, to })
  if (!p) {
    return NextResponse.json({ error: '未找到学员数据' }, { status: 404 })
  }

  const keywords = (typeof body.keywords === 'string' && body.keywords.trim()) || ''

  const subjects = p.record.trendBySubject.map((t) => t.subject).filter(Boolean)
  const uniqueSubjects = [...new Set(subjects.length ? subjects : [])]

  const facts: string[] = [
    `学生：${p.identity.name}（${p.identity.grade ?? '未知年级'}）`,
    `科目：${uniqueSubjects.length ? uniqueSubjects.join('、') : '暂无科目记录'}`,
  ]

  if (p.overview.attendanceRate !== null) {
    facts.push(`本阶段出勤率：${p.overview.attendanceRate}%`)
  }

  facts.push(`逐题掌握率：${p.study.mastery.masteredPct}%（共 ${p.study.mastery.total} 题，需复习 ${p.study.mastery.reviewPct}%，薄弱 ${p.study.mastery.weakPct}%）`)

  if (p.study.weaknesses.length) {
    const weakList = p.study.weaknesses.slice(0, 4).map((w) => `${w.topic}（错 ${w.mistakeCount} 次）`).join('、')
    facts.push(`薄弱知识点：${weakList}`)
  } else {
    facts.push('薄弱知识点：暂无记录')
  }

  if (p.habits.homeworkDoneRate !== null) {
    facts.push(`作业完成率：${p.habits.homeworkDoneRate}%`)
  }
  if (p.habits.inClassAvg !== null) {
    facts.push(`课堂表现均分：${p.habits.inClassAvg}/5`)
  }

  if (p.record.trendBySubject.length) {
    const trends = p.record.trendBySubject
      .map((t) => {
        const latest = t.points.at(-1)
        return latest ? `${t.subject} 最近 ${latest.name} ${latest.pct}%` : null
      })
      .filter(Boolean)
      .slice(0, 4)
    if (trends.length) facts.push(`近期成绩趋势：${trends.join('；')}`)
  }

  const highlights = p.record.timeline
    .filter((item) => ['feedback', 'badge', 'post'].includes(item.type))
    .slice(0, 3)
  if (highlights.length) {
    facts.push(`近期亮点：${highlights.map((h) => h.title).join('；')}`)
  }

  const factsBlock = facts.join('\n')

  const sysPrompt = kind === 'stage'
    ? '你是资深课外辅导老师，为家长撰写阶段学情小结（~100字）。要求：温暖、具体、基于数据、给出明确方向。只输出正文，不要标题和前缀。'
    : '你是资深课外辅导老师，为家长撰写简短的课堂反馈（~100字）。要求：温暖、具体、基于事实、给家长放心感。只输出正文，不要标题和前缀。'

  const userPrompt = [
    '【以下为真实数据，只能依据这些事实，严禁编造任何数字、事件或表现】',
    factsBlock,
    '',
    keywords ? `【老师强调的关键词】：${keywords}` : '【老师强调的关键词】：（无）',
    '',
    '【写作要求】',
    '1. 约100字（90–120字），中文，面向家长的口吻（用学生名字称呼，如"梓萌本阶段…"）。',
    '2. 只能使用上面给定的真实数据；没有的数据不要提，更不能虚构分数、排名、具体事件。',
    '3. 关键词用于决定强调重点与语气，不是事实来源。',
    '4. 结构：肯定进步 → 客观现状 → 下一步建议。不要出现"AI""根据数据""系统生成"等字样。',
    '5. 只输出反馈正文，不要前后缀、不要标题、不要署名。',
  ].join('\n')

  try {
    const text = await callDeepSeek({ system: sysPrompt, user: userPrompt, maxTokens: 350 })
    return NextResponse.json({ draft: (text || '').trim() })
  } catch (error) {
    console.error('[ai-feedback]', error)
    if (error instanceof AIProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 })
    }
    return NextResponse.json({ error: 'AI 生成失败，请稍后重试' }, { status: 500 })
  }
})
