import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/teacher-portal'
import { getRequestDivision } from '@/lib/division'
import { classifySalaryBucket, type SalaryBucket } from '@/lib/salary-bucket'

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
    const requestedBucket = req.nextUrl.searchParams.get('bucket')
    const bucket = requestedBucket === 'SMALL_CLASS' || requestedBucket === 'INTENSIVE'
      ? requestedBucket
      : 'ALL'
    const division = getRequestDivision(adminUser, req.nextUrl.searchParams.get('division'))
    const since = salaryPeriodStart(period)
    const where = {
      ...(teacherId ? { teacherId } : {}),
      teacher: { division },
      createdAt: { gte: since },
    }

    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || 1))
    const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 50)))

    const [teachers, summaryTransactions, feedbackAggregates] = await Promise.all([
      prisma.teacher.findMany({
        where: { status: 'ACTIVE', division },
        select: { id: true, name: true, avatar: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.teacherSalaryTransaction.findMany({
        where,
        include: { teacher: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.classroomFeedback.groupBy({
        by: ['teacherId'],
        where: {
          ...(teacherId ? { teacherId } : {}),
          teacher: { division },
          status: 'PUBLISHED',
          createdAt: { gte: since },
        },
        _count: { _all: true },
      }),
    ])

    const contextTransactions = summaryTransactions
    const lessonIds = [...new Set(contextTransactions.map((item) => item.lessonId).filter((id): id is string => Boolean(id)))]
    const feedbackIds = [...new Set(contextTransactions.map((item) => item.feedbackId).filter((id): id is string => Boolean(id)))]
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

    const summaryMap = new Map<string, { teacherId: string; name: string; avatar: string | null; lesson: number; feedback: number; adjustment: number; smallClass: number; intensive: number; feedbackCount: number; rewardCount: number; total: number }>()
    for (const teacher of teachers) {
      if (!teacherId || teacher.id === teacherId) {
        summaryMap.set(teacher.id, { teacherId: teacher.id, name: teacher.name, avatar: teacher.avatar, lesson: 0, feedback: 0, adjustment: 0, smallClass: 0, intensive: 0, feedbackCount: 0, rewardCount: 0, total: 0 })
      }
    }
    for (const item of summaryTransactions) {
      const row = summaryMap.get(item.teacherId)
      if (!row) continue
      const amount = item.amount
      if (item.type === 'LESSON_PAY' || item.type === 'LESSON_PAY_ADJUSTMENT') row.lesson += amount
      if (item.type === 'FEEDBACK_BONUS') {
        row.feedback += amount
        row.rewardCount += 1
      }
      if (!['LESSON_PAY', 'LESSON_PAY_ADJUSTMENT', 'FEEDBACK_BONUS'].includes(item.type)) row.adjustment += amount
      if (salaryBucket(item) === 'INTENSIVE') row.intensive += amount
      else row.smallClass += amount
      row.total += amount
    }
    for (const item of feedbackAggregates) {
      const row = summaryMap.get(item.teacherId)
      if (row) row.feedbackCount = item._count._all
    }

    const rewardClient = (prisma as unknown as { feedbackRewardRecord?: { groupBy(args: unknown): Promise<Array<{ teacherId: string; _count: { _all: number } }>> } }).feedbackRewardRecord
    if (rewardClient) {
      try {
        const rewardAggregates = await rewardClient.groupBy({
          by: ['teacherId'],
          where: { ...(teacherId ? { teacherId } : {}), amount: { gt: 0 }, createdAt: { gte: since } },
          _count: { _all: true },
        })
        for (const item of rewardAggregates) {
          const row = summaryMap.get(item.teacherId)
          if (row) row.rewardCount = item._count._all
        }
      } catch {
        // Migration not deployed yet: transaction count remains the compatibility value.
      }
    }

    const summary = [...summaryMap.values()].map((row) => ({
      ...row,
      lesson: Number(row.lesson.toFixed(2)),
      feedback: Number(row.feedback.toFixed(2)),
      adjustment: Number(row.adjustment.toFixed(2)),
      smallClass: Number(row.smallClass.toFixed(2)),
      intensive: Number(row.intensive.toFixed(2)),
      total: Number(row.total.toFixed(2)),
    }))
    const filteredTransactions = bucket === 'ALL'
      ? summaryTransactions
      : summaryTransactions.filter((item) => salaryBucket(item) === bucket)
    const pagedTransactions = filteredTransactions.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      period,
      bucket,
      total: filteredTransactions.length,
      page,
      limit,
      summary,
      transactions: pagedTransactions.map((item) => ({
        id: item.id,
        teacherId: item.teacher.id,
        teacherName: item.teacher.name,
        type: item.type,
        salaryBucket: salaryBucket(item),
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
    const body = await req.json() as { teacherId?: unknown; amount?: unknown; description?: unknown; salaryBucket?: unknown }
    const teacherId = typeof body.teacherId === 'string' ? body.teacherId.trim() : ''
    const amount = body.amount
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const salaryBucket: SalaryBucket = body.salaryBucket === 'INTENSIVE' ? 'INTENSIVE' : 'SMALL_CLASS'

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
        description: `${salaryBucket === 'INTENSIVE' ? '[一对一/二/三]' : '[小班课]'} ${description}`,
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
