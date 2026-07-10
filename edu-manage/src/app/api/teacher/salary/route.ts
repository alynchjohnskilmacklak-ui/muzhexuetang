import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'

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

    const totalLesson = transactions.filter((item) => item.type === 'LESSON_PAY').reduce((sum, item) => sum + item.amount, 0)
    const totalFeedback = transactions.filter((item) => item.type === 'FEEDBACK_BONUS').reduce((sum, item) => sum + item.amount, 0)
    const totalAdjustment = transactions
      .filter((item) => item.type !== 'LESSON_PAY' && item.type !== 'FEEDBACK_BONUS')
      .reduce((sum, item) => sum + item.amount, 0)
    const total = transactions.reduce((sum, item) => sum + item.amount, 0)
    const typeLabel = (type: string) => {
      if (type === 'LESSON_PAY') return '课时费'
      if (type === 'FEEDBACK_BONUS') return '反馈奖励'
      if (type === 'manual_adjust') return '薪资调整'
      return '其他调整'
    }

    return NextResponse.json({
      period,
      total: Number(total.toFixed(2)),
      totalLesson: Number(totalLesson.toFixed(2)),
      totalFeedback: Number(totalFeedback.toFixed(2)),
      totalAdjustment: Number(totalAdjustment.toFixed(2)),
      transactions: transactions.map((item) => ({
        id: item.id,
        type: item.type,
        typeLabel: typeLabel(item.type),
        amount: item.amount,
        description: item.description,
        lessonDate: item.lessonDate?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    })
})
