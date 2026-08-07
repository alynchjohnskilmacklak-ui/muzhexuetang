import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import { classifySalaryBucket } from '@/lib/salary-bucket'

export const dynamic = 'force-dynamic'

function salaryPeriodStart(period: string) {
  const now = new Date()
  if (period === 'week') return new Date(now.getTime() - 7 * 86400000)
  if (period === 'all') return new Date(0)
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export const GET = apiHandler(async (req: NextRequest) => {
    const { teacher, prisma } = await requireCurrentTeacher()
    const period = req.nextUrl.searchParams.get('period') || 'month'
    const since = salaryPeriodStart(period)

    const transactions = await prisma.teacherSalaryTransaction.findMany({
      where: { teacherId: teacher.id, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    })

    const lessonIds = [...new Set(transactions.map((item) => item.lessonId).filter((id): id is string => Boolean(id)))]
    const feedbackIds = [...new Set(transactions.map((item) => item.feedbackId).filter((id): id is string => Boolean(id)))]
    const [salaryLessons, salaryFeedbacks] = await Promise.all([
      lessonIds.length ? prisma.classLesson.findMany({
        where: { id: { in: lessonIds } },
        select: { id: true, group: { select: { intensiveMode: true } } },
      }) : [],
      feedbackIds.length ? prisma.classroomFeedback.findMany({
        where: { id: { in: feedbackIds } },
        select: {
          id: true,
          feedbackCourseType: true,
          feedbackGroupId: true,
          classLesson: { select: { group: { select: { intensiveMode: true } } } },
        },
      }) : [],
    ])
    const feedbackGroupIds = [...new Set(salaryFeedbacks.map((item) => item.feedbackGroupId).filter((id): id is string => Boolean(id)))]
    const salaryGroups = feedbackGroupIds.length ? await prisma.classGroup.findMany({
      where: { id: { in: feedbackGroupIds } },
      select: { id: true, intensiveMode: true },
    }) : []
    const lessonIntensiveMap = new Map(salaryLessons.map((item) => [item.id, item.group.intensiveMode === 'INTENSIVE']))
    const groupIntensiveMap = new Map(salaryGroups.map((item) => [item.id, item.intensiveMode === 'INTENSIVE']))
    const feedbackIntensiveMap = new Map(salaryFeedbacks.map((item) => [
      item.id,
      item.classLesson?.group.intensiveMode === 'INTENSIVE'
        || (item.feedbackGroupId ? groupIntensiveMap.get(item.feedbackGroupId) === true : false)
        || ['ONE_ON_ONE', 'ONE_ON_TWO', 'ONE_ON_THREE'].includes(item.feedbackCourseType || ''),
    ]))
    const salaryBucket = (item: { lessonId?: string | null; feedbackId?: string | null; description?: string | null }) =>
      classifySalaryBucket({
        lessonIsIntensive: item.lessonId ? lessonIntensiveMap.get(item.lessonId) === true : false,
        feedbackIsIntensive: item.feedbackId ? feedbackIntensiveMap.get(item.feedbackId) === true : false,
        description: item.description,
      })

    const lessonPayTypes = new Set(['LESSON_PAY', 'LESSON_PAY_ADJUSTMENT'])
    const totalLesson = transactions.filter((item) => lessonPayTypes.has(item.type)).reduce((sum, item) => sum + item.amount, 0)
    const totalFeedback = transactions.filter((item) => item.type === 'FEEDBACK_BONUS').reduce((sum, item) => sum + item.amount, 0)
    const totalAdjustment = transactions
      .filter((item) => !lessonPayTypes.has(item.type) && item.type !== 'FEEDBACK_BONUS')
      .reduce((sum, item) => sum + item.amount, 0)
    const total = transactions.reduce((sum, item) => sum + item.amount, 0)
    const totalSmallClass = transactions
      .filter((item) => salaryBucket(item) === 'SMALL_CLASS')
      .reduce((sum, item) => sum + item.amount, 0)
    const totalIntensive = transactions
      .filter((item) => salaryBucket(item) === 'INTENSIVE')
      .reduce((sum, item) => sum + item.amount, 0)
    const typeLabel = (type: string) => {
      if (type === 'LESSON_PAY') return '课时费'
      if (type === 'LESSON_PAY_ADJUSTMENT') return '课时费结算调整'
      if (type === 'FEEDBACK_BONUS') return '反馈奖励'
      if (type === 'manual_adjust') return '薪资调整'
      return '其他调整'
    }

    return NextResponse.json({
      period,
      total: Number(total.toFixed(2)),
      totalSmallClass: Number(totalSmallClass.toFixed(2)),
      totalIntensive: Number(totalIntensive.toFixed(2)),
      totalLesson: Number(totalLesson.toFixed(2)),
      totalFeedback: Number(totalFeedback.toFixed(2)),
      totalAdjustment: Number(totalAdjustment.toFixed(2)),
      transactions: transactions.map((item) => ({
        id: item.id,
        type: item.type,
        salaryBucket: salaryBucket(item),
        typeLabel: typeLabel(item.type),
        amount: item.amount,
        description: item.description,
        lessonDate: item.lessonDate?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    })
})
