import { NextRequest, NextResponse } from 'next/server'
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
    const prisma = adminUser.prisma
    const teacherId = req.nextUrl.searchParams.get('teacherId')
    const period = req.nextUrl.searchParams.get('period') || 'month'
    const division = getRequestDivision(adminUser, req.nextUrl.searchParams.get('division'))
    const since = salaryPeriodStart(period)
    const where = {
      ...(teacherId ? { teacherId } : {}),
      teacher: { division },
      createdAt: { gte: since },
    }

    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || 1))
    const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 50)))

    const [transactions, total, teachers, aggregates] = await Promise.all([
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
      prisma.teacherSalaryTransaction.groupBy({
        by: ['teacherId', 'type'],
        where,
        _sum: { amount: true },
      }),
    ])

    const summaryMap = new Map<string, { teacherId: string; name: string; avatar: string | null; lesson: number; feedback: number; total: number }>()
    for (const teacher of teachers) {
      if (!teacherId || teacher.id === teacherId) {
        summaryMap.set(teacher.id, { teacherId: teacher.id, name: teacher.name, avatar: teacher.avatar, lesson: 0, feedback: 0, total: 0 })
      }
    }
    for (const item of aggregates) {
      const row = summaryMap.get(item.teacherId)
      if (!row) continue
      const amount = item._sum.amount ?? 0
      if (item.type === 'LESSON_PAY') row.lesson += amount
      if (item.type === 'FEEDBACK_BONUS') row.feedback += amount
      row.total += amount
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
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_UNAUTHORIZED') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    console.error('[admin:salary:get]', error)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdminUser()
    const body = await req.json() as { teacherId?: unknown; amount?: unknown; description?: unknown }
    const teacherId = typeof body.teacherId === 'string' ? body.teacherId.trim() : ''
    const amount = body.amount
    const description = typeof body.description === 'string' ? body.description.trim() : ''

    if (!teacherId) return NextResponse.json({ error: '请选择教师' }, { status: 400 })
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: '调整金额必须是非0有效数字' }, { status: 400 })
    }
    if (!description) return NextResponse.json({ error: '请填写调整原因' }, { status: 400 })

    const teacher = await adminUser.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true },
    })
    if (!teacher) return NextResponse.json({ error: '教师不存在' }, { status: 404 })

    const transaction = await adminUser.prisma.teacherSalaryTransaction.create({
      data: {
        teacherId,
        type: 'manual_adjust',
        amount,
        description,
        createdAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, transaction: { ...transaction, teacherName: teacher.name } }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_UNAUTHORIZED') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    console.error('[admin:salary:post]', error)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminUser = await requireAdminUser()
    const id = req.nextUrl.searchParams.get('id')?.trim() || ''
    if (!id) return NextResponse.json({ error: '缺少流水ID' }, { status: 400 })

    const transaction = await adminUser.prisma.teacherSalaryTransaction.findUnique({
      where: { id },
      select: { id: true, type: true },
    })
    if (!transaction) return NextResponse.json({ error: '流水不存在' }, { status: 404 })
    if (transaction.type !== 'manual_adjust') {
      return NextResponse.json({ error: '只能删除手动调整流水' }, { status: 400 })
    }

    await adminUser.prisma.teacherSalaryTransaction.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_UNAUTHORIZED') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    console.error('[admin:salary:delete]', error)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
}
