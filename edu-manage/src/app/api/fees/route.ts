import { NextRequest, NextResponse } from 'next/server'
import { getPrismaForDivision, isDualDbEnabled, getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import type { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

type Division = 'JUNIOR' | 'SENIOR'

interface FeeFilters {
  division?: string
  type?: string
  campus?: string
  from?: string
  to?: string
  studentId?: string
  page?: number
  limit?: number
  termId?: string
}

async function queryFees(
  db: PrismaClient,
  filters: FeeFilters,
) {
  const { type, campus, from, to, studentId, termId, page = 1, limit = 50 } = filters
  const where: Record<string, unknown> = {}

  if (termId) where.termId = termId
  if (type) where.type = type
  if (campus) where.campus = campus
  if (studentId) where.studentId = studentId
  if (from || to) {
    const paidAt: Record<string, Date> = {}
    if (from) paidAt.gte = new Date(from)
    if (to) paidAt.lte = new Date(to + 'T23:59:59.999Z')
    where.paidAt = paidAt
  }

  const [rows, total] = await Promise.all([
    db.fee.findMany({
      where,
      include: { student: { select: { id: true, name: true, division: true } }, course: { select: { id: true, name: true } } },
      orderBy: { paidAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.fee.count({ where }),
  ])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthWhere = { ...where }
  delete monthWhere.paidAt
  const paidAtMonth: Record<string, Date> = { gte: monthStart, lte: now }
  if (from || to) {
    if (from) paidAtMonth.gte = new Date(from)
    if (to) paidAtMonth.lte = new Date(to + 'T23:59:59.999Z')
  }
  monthWhere.paidAt = paidAtMonth

  const [totalAmount, monthAmount, oneOnOneAmount, classAmount, totalHours, count] = await Promise.all([
    db.fee.aggregate({ where, _sum: { amount: true } }),
    db.fee.aggregate({ where: monthWhere, _sum: { amount: true } }),
    db.fee.aggregate({ where: { ...where, type: '1对1' }, _sum: { amount: true } }),
    db.fee.aggregate({ where: { ...where, type: '班课' }, _sum: { amount: true } }),
    db.fee.aggregate({ where, _sum: { hours: true } }),
    Promise.resolve(total),
  ])

  return {
    rows,
    summary: {
      totalAmount: totalAmount._sum.amount ?? 0,
      monthAmount: monthAmount._sum.amount ?? 0,
      oneOnOneAmount: oneOnOneAmount._sum.amount ?? 0,
      classAmount: classAmount._sum.amount ?? 0,
      totalHours: totalHours._sum.hours ?? 0,
      count,
    },
  }
}

function mergeDualResults(
  junior: Awaited<ReturnType<typeof queryFees>>,
  senior: Awaited<ReturnType<typeof queryFees>>,
  page: number,
  limit: number,
) {
  const allRows = [...junior.rows, ...senior.rows]
    .sort((a, b) => new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime())

  const total = allRows.length
  const paged = allRows.slice((page - 1) * limit, page * limit)

  return {
    rows: paged,
    total,
    page,
    limit,
    summary: {
      totalAmount: junior.summary.totalAmount + senior.summary.totalAmount,
      monthAmount: junior.summary.monthAmount + senior.summary.monthAmount,
      oneOnOneAmount: junior.summary.oneOnOneAmount + senior.summary.oneOnOneAmount,
      classAmount: junior.summary.classAmount + senior.summary.classAmount,
      totalHours: (junior.summary.totalHours ?? 0) + (senior.summary.totalHours ?? 0),
      count: junior.summary.count + senior.summary.count,
    },
  }
}

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const division = searchParams.get('division') || 'JUNIOR'
  const type = searchParams.get('type') || undefined
  const campus = searchParams.get('campus') || undefined
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const studentId = searchParams.get('studentId') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

  // Student aggregate mode
  if (studentId && searchParams.get('aggregate') === 'true') {
    const db = division === 'SENIOR'
      ? getPrismaForDivision('SENIOR')
      : division === 'JUNIOR'
        ? getPrismaForDivision('JUNIOR')
        : await getRequestPrisma()

    const scopedDivision = division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
    const selectedTerm = await resolveAdminTermScope(db, scopedDivision, req)
    const allRows = await db.fee.findMany({
      where: { studentId, termId: selectedTerm?.id || '__NO_SELECTED_TERM__' },
      include: { student: { select: { id: true, name: true, division: true } }, course: { select: { id: true, name: true } } },
      orderBy: { paidAt: 'desc' },
    })

    const totalAmount = allRows.reduce((s, f) => s + f.amount, 0)
    const totalHours = allRows.reduce((s, f) => s + (f.hours ?? 0), 0)
    const studentName = allRows[0]?.student?.name ?? ''

    return NextResponse.json({
      student: { id: studentId, name: studentName },
      totalAmount,
      totalHours,
      count: allRows.length,
      rows: allRows,
    })
  }

  if (division === 'all' && isDualDbEnabled()) {
    const [juniorTerm, seniorTerm] = await Promise.all([
      resolveAdminTermScope(getPrismaForDivision('JUNIOR'), 'JUNIOR', req),
      resolveAdminTermScope(getPrismaForDivision('SENIOR'), 'SENIOR', req),
    ])
    const [junior, senior] = await Promise.all([
      queryFees(getPrismaForDivision('JUNIOR'), { division, type, campus, from, to, studentId, page, limit, termId: juniorTerm?.id || '__NO_SELECTED_TERM__' }),
      queryFees(getPrismaForDivision('SENIOR'), { division, type, campus, from, to, studentId, page, limit, termId: seniorTerm?.id || '__NO_SELECTED_TERM__' }),
    ])
    return NextResponse.json(mergeDualResults(junior, senior, page, limit))
  }

  const db = division === 'SENIOR'
    ? getPrismaForDivision('SENIOR')
    : getPrismaForDivision('JUNIOR')

  const scopedDivision = division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
  const selectedTerm = await resolveAdminTermScope(db, scopedDivision, req)
  const result = await queryFees(db, {
    division, type, campus, from, to, studentId, page, limit,
    termId: selectedTerm?.id || '__NO_SELECTED_TERM__',
  })
  return NextResponse.json({ ...result, total: result.summary.count, page, limit })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json()

  const { studentId, type, amount, hours, campus, operator, notes, paidAt, courseId } = body
  const requestedDivision: Division = body.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
  const db = isDualDbEnabled()
    ? getPrismaForDivision(requestedDivision)
    : await getRequestPrisma()

  if (!studentId || typeof studentId !== 'string') {
    return NextResponse.json({ error: '请选择学生' }, { status: 400 })
  }
  if (typeof amount !== 'number' || amount < 0) {
    return NextResponse.json({ error: '金额必须 >= 0' }, { status: 400 })
  }
  if (hours !== undefined && hours !== null && (typeof hours !== 'number' || hours < 0)) {
    return NextResponse.json({ error: '课时数必须 >= 0' }, { status: 400 })
  }

  const student = await db.student.findUnique({ where: { id: studentId }, select: { id: true, division: true } })
  if (!student) return NextResponse.json({ error: '学生不存在' }, { status: 404 })
  if (student.division !== requestedDivision) {
    return NextResponse.json({ error: '学生学部与收费记录不一致' }, { status: 400 })
  }

  const selectedTerm = await resolveAdminTermScope(db, requestedDivision, req)
  if (!selectedTerm || selectedTerm.status !== 'ACTIVE') {
    return NextResponse.json({ error: '请先进入一个已启用的运营批次再录入收费' }, { status: 409 })
  }
  const membership = await db.studentTermMembership.findFirst({
    where: { termId: selectedTerm.id, studentId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!membership) {
    return NextResponse.json({ error: '该学员不属于当前运营批次，不能录入本期收费' }, { status: 409 })
  }

  const fee = await db.fee.create({
    data: {
      termId: selectedTerm.id,
      studentId,
      courseId: courseId || null,
      amount,
      type: type || '其他',
      status: 'paid',
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      hours: hours ?? null,
      campus: campus || null,
      operator: operator || null,
      notes: notes || null,
      division: student.division,
    },
  })

  const userId = (session.user as { id: string }).id
  await db.activityLog.create({
    data: { userId, action: '新增收费记录', detail: `${student.division} ${studentId} ${type || '其他'} ¥${amount}` },
  })

  revalidatePath('/fees')
  return NextResponse.json(fee, { status: 201 })
})
