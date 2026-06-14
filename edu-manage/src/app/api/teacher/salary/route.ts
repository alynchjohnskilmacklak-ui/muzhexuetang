import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentTeacher } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

function salaryPeriodStart(period: string) {
  const now = new Date()
  if (period === 'week') return new Date(now.getTime() - 7 * 86400000)
  if (period === 'all') return new Date(0)
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export async function GET(req: NextRequest) {
  try {
    const { teacher, prisma } = await requireCurrentTeacher()
    const period = req.nextUrl.searchParams.get('period') || 'month'
    const since = salaryPeriodStart(period)

    const transactions = await prisma.teacherSalaryTransaction.findMany({
      where: { teacherId: teacher.id, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    })

    const totalLesson = transactions.filter((item) => item.type === 'LESSON_PAY').reduce((sum, item) => sum + item.amount, 0)
    const totalFeedback = transactions.filter((item) => item.type === 'FEEDBACK_BONUS').reduce((sum, item) => sum + item.amount, 0)
    const total = totalLesson + totalFeedback

    return NextResponse.json({
      period,
      total: Number(total.toFixed(2)),
      totalLesson: Number(totalLesson.toFixed(2)),
      totalFeedback: Number(totalFeedback.toFixed(2)),
      transactions: transactions.map((item) => ({
        id: item.id,
        type: item.type,
        amount: item.amount,
        description: item.description,
        lessonDate: item.lessonDate?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    })
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}
