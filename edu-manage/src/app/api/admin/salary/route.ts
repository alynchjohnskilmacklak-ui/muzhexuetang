import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/teacher-portal'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

function salaryPeriodStart(period: string) {
  const now = new Date()
  if (period === 'week') return new Date(now.getTime() - 7 * 86400000)
  if (period === 'all') return new Date(0)
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export async function GET(req: NextRequest) {
  try {
    const adminUser = await requireAdminUser()
    const teacherId = req.nextUrl.searchParams.get('teacherId')
    const period = req.nextUrl.searchParams.get('period') || 'month'
    const division = getRequestDivision(adminUser, req.nextUrl.searchParams.get('division'))
    const since = salaryPeriodStart(period)
    const where = teacherId
      ? { teacherId, createdAt: { gte: since } }
      : { createdAt: { gte: since } }

    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || 1))
    const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 50)))

    const [transactions, total, teachers] = await Promise.all([
      prisma.teacherSalaryTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { teacher: { select: { id: true, name: true, avatar: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.teacherSalaryTransaction.count({ where }),
      prisma.teacher.findMany({
        where: { status: 'ACTIVE', division },
        select: { id: true, name: true, avatar: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const summaryMap = new Map<string, { teacherId: string; name: string; avatar: string | null; lesson: number; feedback: number; total: number }>()
    for (const teacher of teachers) {
      if (!teacherId || teacher.id === teacherId) {
        summaryMap.set(teacher.id, { teacherId: teacher.id, name: teacher.name, avatar: teacher.avatar, lesson: 0, feedback: 0, total: 0 })
      }
    }
    for (const item of transactions) {
      const row = summaryMap.get(item.teacher.id)
      if (!row) continue
      if (item.type === 'LESSON_PAY') row.lesson += item.amount
      if (item.type === 'FEEDBACK_BONUS') row.feedback += item.amount
      row.total += item.amount
    }

    const summary = [...summaryMap.values()].map((row) => ({
      ...row,
      lesson: Number(row.lesson.toFixed(2)),
      feedback: Number(row.feedback.toFixed(2)),
      total: Number(row.total.toFixed(2)),
    }))

    return NextResponse.json({
      period,
      total,
      page,
      limit,
      summary,
      transactions: transactions.map((item) => ({
        id: item.id,
        teacherId: item.teacher.id,
        teacherName: item.teacher.name,
        type: item.type,
        amount: item.amount,
        description: item.description,
        lessonDate: item.lessonDate?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
      teachers,
    })
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}
