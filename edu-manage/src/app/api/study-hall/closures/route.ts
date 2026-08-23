import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAuthenticatedUser } from '@/lib/auth/guards'
import { parseDateKey } from '@/lib/study-hall/domain'
import { todayLocal } from '@/lib/date/local-day'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireAuthenticatedUser()
  if (user.role !== 'admin') return NextResponse.json({ error: '仅管理员可以设置放假' }, { status: 403 })
  const body = await request.json() as Record<string, unknown>
  const termId = typeof body.termId === 'string' ? body.termId : ''
  const scope = body.scope === 'CLASSES' ? 'CLASSES' : 'ALL'
  const requestedClassIds = scope === 'CLASSES' && Array.isArray(body.classIds)
    ? [...new Set(body.classIds.filter((item): item is string => typeof item === 'string' && Boolean(item)).slice(0, 100))]
    : []
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 100) : ''
  let startDate: Date
  let endDate: Date
  try {
    startDate = parseDateKey(String(body.startDate || ''))
    endDate = parseDateKey(String(body.endDate || ''))
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
  if (startDate > endDate) return NextResponse.json({ error: '放假结束日期不能早于开始日期' }, { status: 400 })
  if (startDate < parseDateKey(todayLocal())) return NextResponse.json({ error: '不能补录已经过去的放假；历史考勤需要单独核对' }, { status: 409 })
  if (!reason) return NextResponse.json({ error: '请填写放假原因' }, { status: 400 })
  const term = await user.prisma.academicTerm.findFirst({ where: { id: termId, division: user.division, status: 'ACTIVE' }, select: { id: true, startDate: true, endDate: true } })
  if (!term) return NextResponse.json({ error: '只能给当前有效运营期设置放假' }, { status: 409 })
  if (startDate < term.startDate || endDate > term.endDate) return NextResponse.json({ error: '放假日期必须在当前运营期范围内' }, { status: 409 })
  if (scope === 'CLASSES' && !requestedClassIds.length) return NextResponse.json({ error: '请至少选择一个作业班' }, { status: 400 })
  if (requestedClassIds.length) {
    const studyClasses = await user.prisma.studyHallClass.findMany({ where: { id: { in: requestedClassIds }, termId, division: user.division }, select: { id: true } })
    if (studyClasses.length !== requestedClassIds.length) return NextResponse.json({ error: '部分所选作业班不存在或不属于当前运营期' }, { status: 404 })
  }
  const existingAttendance = await user.prisma.studyHallHomeworkEntry.count({
    where: {
      OR: [{ checkedIn: true }, { attendanceStatus: { in: ['PERSONAL_LEAVE', 'ABSENT'] } }],
      classRecord: { studyDate: { gte: startDate, lte: endDate }, studyClass: { termId, ...(requestedClassIds.length ? { id: { in: requestedClassIds } } : {}) } },
    },
  })
  if (existingAttendance) return NextResponse.json({ error: '所选日期已有考勤记录，请先核对并清理记录后再设置放假' }, { status: 409 })
  const overlap = await user.prisma.studyHallClosure.findFirst({
    where: {
      termId, division: user.division, startDate: { lte: endDate }, endDate: { gte: startDate },
      ...(requestedClassIds.length ? { OR: [{ classId: null }, { classId: { in: requestedClassIds } }] } : {}),
    },
    select: { reason: true },
  })
  if (overlap) return NextResponse.json({ error: `所选范围已存在重叠放假：${overlap.reason}` }, { status: 409 })
  const closures = await user.prisma.$transaction(
    (requestedClassIds.length ? requestedClassIds : [null]).map((classId) => user.prisma.studyHallClosure.create({ data: { termId, division: user.division, classId, startDate, endDate, reason, createdById: user.id } })),
  )
  return NextResponse.json({ closures }, { status: 201 })
})

export const DELETE = apiHandler(async (request: NextRequest) => {
  const user = await requireAuthenticatedUser()
  if (user.role !== 'admin') return NextResponse.json({ error: '仅管理员可以取消放假' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id') || ''
  const closure = await user.prisma.studyHallClosure.findFirst({ where: { id, division: user.division }, select: { id: true, startDate: true } })
  if (!closure) return NextResponse.json({ error: '放假记录不存在' }, { status: 404 })
  if (closure.startDate < parseDateKey(new Date().toISOString().slice(0, 10))) return NextResponse.json({ error: '已开始的放假记录不能直接删除，请联系管理员核对历史数据' }, { status: 409 })
  await user.prisma.studyHallClosure.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
