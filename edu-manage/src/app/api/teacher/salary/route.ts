import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import { classifySalaryBucket } from '@/lib/salary-bucket'
import { salaryPeriodStart, pendingSalaryTransactions } from '@/lib/salary-settlement'

export const dynamic = 'force-dynamic'


export const GET = apiHandler(async (req: NextRequest) => {
    const { teacher, prisma } = await requireCurrentTeacher()
    const period = req.nextUrl.searchParams.get('period') || 'month'
    const since = salaryPeriodStart(period)
    const activeTerm = await prisma.academicTerm.findFirst({
      where: { division: teacher.division, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true },
    })

    const transactions = await prisma.teacherSalaryTransaction.findMany({
      where: {
        teacherId: teacher.id,
        createdAt: { gte: since },
        termId: activeTerm?.id || '__NO_ACTIVE_TERM__',
        deletedAt: null,
      },
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

    const settlement = transactions
      .filter((item) => item.type === 'SALARY_SETTLEMENT')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
    const earnTransactions = pendingSalaryTransactions(transactions)
    const pendingIds = new Set(earnTransactions.map(item => item.id))
    const lessonPayTypes = new Set(['LESSON_PAY', 'LESSON_PAY_ADJUSTMENT'])
    const rewardTypes = new Set(['FEEDBACK_BONUS', 'STUDY_HALL_BONUS', 'STUDY_HALL_ATTENDANCE'])
    const totalLesson = earnTransactions.filter((item) => lessonPayTypes.has(item.type)).reduce((sum, item) => sum + item.amount, 0)
    const totalFeedback = earnTransactions.filter((item) => rewardTypes.has(item.type)).reduce((sum, item) => sum + item.amount, 0)
    const totalAdjustment = earnTransactions
      .filter((item) => !lessonPayTypes.has(item.type) && !rewardTypes.has(item.type))
      .reduce((sum, item) => sum + item.amount, 0)
    const total = earnTransactions.reduce((sum, item) => sum + item.amount, 0)
    const totalSmallClass = earnTransactions
      .filter((item) => salaryBucket(item) === 'SMALL_CLASS')
      .reduce((sum, item) => sum + item.amount, 0)
    const totalIntensive = earnTransactions
      .filter((item) => salaryBucket(item) === 'INTENSIVE')
      .reduce((sum, item) => sum + item.amount, 0)
    const typeLabel = (type: string) => {
      if (type === 'LESSON_PAY') return '课时费'
      if (type === 'LESSON_PAY_ADJUSTMENT') return '课时费结算调整'
      if (type === 'FEEDBACK_BONUS') return '反馈奖励'
      if (type === 'STUDY_HALL_BONUS') return '作业登记奖励'
      if (type === 'STUDY_HALL_ATTENDANCE') return '晚托考勤奖励'
      if (type === 'SALARY_SETTLEMENT') return '工资结算'
      if (type === 'manual_adjust') return '薪资调整'
      return '其他调整'
    }

    return NextResponse.json({
      period,
      term: activeTerm,
      total: Number(total.toFixed(2)),
      pendingCount: earnTransactions.length,
      totalSmallClass: Number(totalSmallClass.toFixed(2)),
      totalIntensive: Number(totalIntensive.toFixed(2)),
      totalLesson: Number(totalLesson.toFixed(2)),
      totalFeedback: Number(totalFeedback.toFixed(2)),
      totalAdjustment: Number(totalAdjustment.toFixed(2)),
      settled: settlement ? {
        amount: Number(settlement.amount.toFixed(2)),
        at: settlement.createdAt.toISOString(),
        description: settlement.description,
      } : null,
      transactions: transactions.map((item) => ({
        id: item.id,
        type: item.type,
        salaryBucket: salaryBucket(item),
        typeLabel: typeLabel(item.type),
        amount: item.amount,
        description: item.description,
        lessonDate: item.lessonDate?.toISOString() ?? null,
        settledAt: item.settledAt?.toISOString() ?? null,
        settlementBatchId: item.settlementBatchId,
        settlementStatus: item.type === 'SALARY_SETTLEMENT' ? 'RECEIPT' : pendingIds.has(item.id) ? 'PENDING' : 'SETTLED',
        createdAt: item.createdAt.toISOString(),
      })),
    })
})
