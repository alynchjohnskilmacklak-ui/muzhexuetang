import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

function startOfWeek(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function parseDateRange(searchParams: URLSearchParams): { from: Date; to: Date } {
  const period = searchParams.get('period') || 'month'
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')
  const now = new Date()

  if (fromStr && toStr) {
    return { from: new Date(fromStr), to: new Date(toStr) }
  }

  let from: Date, to: Date
  switch (period) {
    case 'week':
      from = startOfWeek(now)
      to = new Date(from.getTime() + 7 * 86400000)
      break
    case 'quarter':
      from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      to = new Date(from.getFullYear(), from.getMonth() + 3, 1)
      break
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  }
  return { from, to }
}

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const { from, to } = parseDateRange(request.nextUrl.searchParams)

  const [
    totalStudents,
    monthPapers,
    masteredCount,
    totalPaperQuestions,
    studentStatusCounts,
    masteryDistribution,
    weakTopicsRaw,
    publishedPapersCount,
    readCount,
    postCount,
    reactionCount,
    studentCount,
    parentCommentCount,
    consultationTotal,
    consultationReplied,
    attendanceStatusCounts,
    makeupStatusCounts,
    guideActions,
  ] = await Promise.all([
    prisma.student.count({ where: { status: 'ACTIVE' } }),
    prisma.examPaper.count({ where: { status: 'PUBLISHED', paperDate: { gte: from, lt: to } } }),
    prisma.paperQuestion.count({ where: { mastery: 'MASTERED', paper: { paperDate: { gte: from, lt: to } } } }),
    prisma.paperQuestion.count({ where: { paper: { paperDate: { gte: from, lt: to } } } }),
    prisma.student.groupBy({ by: ['status'], _count: true }),
    prisma.paperQuestion.groupBy({ by: ['mastery'], _count: true, where: { paper: { paperDate: { gte: from } } } }),
    prisma.paperQuestion.groupBy({ by: ['topic'], _count: true, where: { mastery: 'NEEDS_PRACTICE', paper: { paperDate: { gte: from } } }, orderBy: { _count: { topic: 'desc' } }, take: 6 }),
    prisma.examPaper.count({ where: { status: 'PUBLISHED', paperDate: { gte: from, lt: to }, isReadByParent: true } }),
    prisma.examPaper.count({ where: { status: 'PUBLISHED', paperDate: { gte: from, lt: to }, isReadByParent: true } }),
    prisma.performancePost.count({ where: { createdAt: { gte: from, lt: to }, deletedAt: null } }),
    prisma.postReaction.count({ where: { post: { createdAt: { gte: from, lt: to }, deletedAt: null } } }),
    prisma.student.count(),
    prisma.paperComment.count({ where: { createdAt: { gte: from, lt: to }, author: { role: 'parent' } } }),
    prisma.volunteerConsultation.count({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.volunteerConsultation.count({ where: { createdAt: { gte: from, lt: to }, isReplied: true } }),
    prisma.attendance.groupBy({ by: ['status'], _count: true, where: { createdAt: { gte: from, lt: to } } }),
    prisma.makeupRequest.groupBy({ by: ['status'], _count: true, where: { createdAt: { gte: from, lt: to } } }),
    prisma.guideViewLog.groupBy({ by: ['action'], _count: true, where: { createdAt: { gte: from, lt: to } } }),
  ])

  const statusMap: Record<string, string> = { LEAD: '潜客咨询', TRIAL: '预约试听', ACTIVE: '报名缴费', INACTIVE: '暂停', GRADUATED: '毕业/离校' }
  const funnel = studentStatusCounts.map((s) => ({ status: statusMap[s.status] || s.status, count: s._count }))

  const masteryAll = { MASTERED: 0, NEEDS_REVIEW: 0, NEEDS_PRACTICE: 0 }
  for (const m of masteryDistribution) {
    if (m.mastery in masteryAll) masteryAll[m.mastery as keyof typeof masteryAll] = m._count
  }
  const weakTopics = weakTopicsRaw.map((w) => ({ topic: w.topic, count: w._count }))

  const masteredRate = totalPaperQuestions > 0 ? Math.round((masteredCount / totalPaperQuestions) * 100) : 0
  const readRate = publishedPapersCount > 0 ? Math.round((readCount / publishedPapersCount) * 100) : 0
  const reactionRate = postCount > 0 ? Math.round((reactionCount / postCount) * 100) : 0
  const commentRate = studentCount > 0 ? Math.round((parentCommentCount / studentCount) * 100) : 0
  const replyRate = consultationTotal > 0 ? Math.round((consultationReplied / consultationTotal) * 100) : 0

  const attPresent = attendanceStatusCounts.find((a) => a.status === 'PRESENT')?._count ?? 0
  const attLeave = attendanceStatusCounts.find((a) => a.status === 'LEAVE')?._count ?? 0
  const attAbsent = attendanceStatusCounts.find((a) => a.status === 'ABSENT')?._count ?? 0
  const attTotal = attPresent + attLeave + attAbsent
  const attendanceRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0

  const mkCompleted = makeupStatusCounts.find((m) => m.status === 'COMPLETED')?._count ?? 0
  const mkArranged = makeupStatusCounts.find((m) => m.status === 'ARRANGED')?._count ?? 0
  const mkPending = makeupStatusCounts.find((m) => m.status === 'PENDING')?._count ?? 0
  const mkTotal = mkCompleted + mkArranged + mkPending
  const makeupCompleteRate = mkTotal > 0 ? Math.round((mkCompleted / mkTotal) * 100) : 0

  // Monthly finance: group fees by month within the range
  const monthlyFees = await prisma.fee.findMany({
    where: { paidAt: { gte: from, lt: to }, status: 'paid' },
    select: { amount: true, paidAt: true },
    orderBy: { paidAt: 'asc' },
  })
  const monthMap = new Map<string, { income: number; expense: number }>()
  for (const fee of monthlyFees) {
    if (!fee.paidAt) continue
    const key = fee.paidAt.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' })
    const existing = monthMap.get(key) || { income: 0, expense: 0 }
    existing.income += fee.amount
    monthMap.set(key, existing)
  }
  const finance = [...monthMap.entries()].map(([month, val]) => ({
    month,
    income: Math.round(val.income),
    expense: Math.round(val.expense),
    profit: Math.round(val.income - val.expense),
  }))

  // Monthly retention: students created each month vs still active
  const retentionMonths: { month: string; rate: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const mFrom = new Date(from.getFullYear(), from.getMonth() - i, 1)
    const mTo = new Date(mFrom.getFullYear(), mFrom.getMonth() + 1, 1)
    const created = await prisma.student.count({ where: { createdAt: { gte: mFrom, lt: mTo } } })
    const stillActive = await prisma.student.count({ where: { createdAt: { gte: mFrom, lt: mTo }, status: 'ACTIVE' } })
    retentionMonths.push({
      month: mFrom.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' }),
      rate: created > 0 ? Math.round((stillActive / created) * 100) : 100,
    })
  }

  return NextResponse.json({
    kpi: {
      totalStudents,
      monthPapers,
      masteredRate,
      parentInteract: replyRate,
    },
    funnel,
    paperMastery: masteryAll,
    weakTopics,
    retention: retentionMonths,
    parentEngagement: { readRate, reactionRate, commentRate, replyRate },
    finance,
    attendance: { attendanceRate, makeupCompleteRate },
    guideUsage: guideActions.map((g) => ({ action: g.action, count: g._count })),
  })
})
