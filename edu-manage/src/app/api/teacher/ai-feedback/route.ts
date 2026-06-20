import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher, assertTeacherOwnsStudent } from '@/lib/teacher-portal'
import { getStudentProfile } from '@/lib/student-profile'
import { callKimi, AIProviderError } from '@/lib/ai/client'

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

export const POST = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()

  if (!checkTeacherAILimit(teacher.id)) {
    return NextResponse.json({ error: 'AI 生成请求过于频繁，请 1 分钟后再试' }, { status: 429 })
  }

  const body = await req.json() as { studentId?: string; keywords?: string; kind?: 'feedback' | 'stage' }
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

  // ── Build fact list from real data ──
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

  // Recent highlights
  const highlights = p.record.timeline
    .filter((item) => ['feedback', 'badge', 'post'].includes(item.type))
    .slice(0, 3)
  if (highlights.length) {
    facts.push(`近期亮点：${highlights.map((h) => h.title).join('；')}`)
  }

  const factsBlock = facts.join('\n')

  // ── Prompt ──
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
    const text = await callKimi({ system: sysPrompt, user: userPrompt, maxTokens: 350, temperature: 0.6 })
    return NextResponse.json({ draft: (text || '').trim() })
  } catch (error) {
    console.error('[ai-feedback]', error)
    if (error instanceof AIProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 })
    }
    return NextResponse.json({ error: 'AI 生成失败，请稍后重试' }, { status: 500 })
  }
})
