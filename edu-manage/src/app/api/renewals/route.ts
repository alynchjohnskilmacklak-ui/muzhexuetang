import { NextRequest, NextResponse } from 'next/server'
import { getPrismaForDivision, getRequestPrisma, isDualDbEnabled } from '@/lib/prisma'
import { requireFeeAdminScope } from '@/lib/fee-admin-scope'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const FOLLOW_UP_STATUSES = new Set(['OPEN', 'CONTACTED', 'RENEWED', 'NOT_RENEWING'])

function daysUntil(date: Date, now: Date) {
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

async function requestScope(request: NextRequest) {
  const scope = await requireFeeAdminScope(request.nextUrl.searchParams.get('division'))
  if (scope.division === 'all') {
    return { ...scope, db: await getRequestPrisma(), division: scope.user.division }
  }
  const db = isDualDbEnabled()
    ? getPrismaForDivision(scope.division)
    : await getRequestPrisma()
  return { ...scope, db }
}

export const GET = apiHandler(async (request: NextRequest) => {
  const scope = await requireFeeAdminScope(request.nextUrl.searchParams.get('division'))
  const allDivisions = scope.division === 'all'
  const divisions = allDivisions && isDualDbEnabled() ? ['JUNIOR', 'SENIOR'] : [allDivisions ? scope.user.division : scope.division]
  const results = await Promise.all(divisions.map(async (division) => {
    const db = isDualDbEnabled() ? getPrismaForDivision(division as 'JUNIOR' | 'SENIOR') : await getRequestPrisma()
    const term = allDivisions
      ? await db.academicTerm.findFirst({ where: { division, status: 'ACTIVE' }, orderBy: { startDate: 'desc' } })
      : await resolveAdminTermScope(db, division, request)
    if (!term || term.status !== 'ACTIVE') return { term: null, lowHoursWarn: 0, renewals: [] }
    const [config, memberships] = await Promise.all([
      db.notifyConfig.findUnique({ where: { id: 'singleton' }, select: { lowHoursWarn: true } }),
      db.studentTermMembership.findMany({
        where: { termId: term.id, status: 'ACTIVE', student: { status: 'ACTIVE', deletedAt: null, division } },
        include: { student: { select: { id: true, name: true, grade: true, remainHours: true, division: true } } },
        orderBy: { student: { name: 'asc' } },
      }),
    ])
    const studentIds = memberships.map((membership) => membership.studentId)
    const followUps = studentIds.length ? await db.renewalFollowUp.findMany({ where: { termId: term.id, studentId: { in: studentIds } } }) : []
    const followUpByStudent = new Map(followUps.map((followUp) => [followUp.studentId, followUp]))
    const lowHoursWarn = config?.lowHoursWarn ?? 0
    const termDaysRemaining = daysUntil(term.endDate, new Date())
    const renewals = memberships.flatMap((membership) => {
      const followUp = followUpByStudent.get(membership.studentId) || null
      const lowHours = lowHoursWarn > 0 && membership.student.remainHours <= lowHoursWarn
      const termEnding = termDaysRemaining >= 0 && termDaysRemaining <= 45
      if (!followUp && !lowHours && !termEnding) return []
      return [{ student: membership.student, term: { id: term.id, name: term.name, endDate: term.endDate.toISOString() }, daysRemaining: termDaysRemaining, trigger: [lowHours ? 'LOW_HOURS' : null, termEnding ? 'TERM_ENDING' : null].filter(Boolean), followUp }]
    })
    return { term: { id: term.id, name: term.name, endDate: term.endDate.toISOString() }, lowHoursWarn, renewals }
  }))
  return NextResponse.json({ terms: results.flatMap(result => result.term ? [result.term] : []), lowHoursWarn: Math.max(0, ...results.map(result => result.lowHoursWarn)), renewals: results.flatMap(result => result.renewals) })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const { user, division, db } = await requestScope(request)
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : ''
  const termId = typeof body?.termId === 'string' ? body.termId.trim() : ''
  const status = typeof body?.status === 'string' ? body.status : 'OPEN'
  const note = typeof body?.note === 'string' ? body.note.trim() : ''
  const nextFollowUpAtRaw = typeof body?.nextFollowUpAt === 'string' ? body.nextFollowUpAt : ''

  if (!studentId || !termId) return NextResponse.json({ error: '缺少学员或运营批次' }, { status: 400 })
  if (!FOLLOW_UP_STATUSES.has(status)) return NextResponse.json({ error: '跟进状态无效' }, { status: 400 })
  if (note.length > 1200) return NextResponse.json({ error: '跟进记录不能超过 1200 字' }, { status: 400 })
  const nextFollowUpAt = nextFollowUpAtRaw ? new Date(nextFollowUpAtRaw) : null
  if (nextFollowUpAtRaw && Number.isNaN(nextFollowUpAt!.getTime())) {
    return NextResponse.json({ error: '下次跟进日期格式无效' }, { status: 400 })
  }

  const membership = await db.studentTermMembership.findFirst({
    where: {
      termId,
      studentId,
      status: 'ACTIVE',
      term: { division, status: 'ACTIVE' },
      student: { division, status: 'ACTIVE', deletedAt: null },
    },
    select: { studentId: true },
  })
  if (!membership) return NextResponse.json({ error: '学员不属于当前启用运营批次' }, { status: 404 })

  const now = new Date()
  const followUp = await db.renewalFollowUp.upsert({
    where: { studentId_termId: { studentId, termId } },
    create: {
      studentId,
      termId,
      status,
      ownerUserId: user.id,
      note: note || null,
      lastContactedAt: ['CONTACTED', 'RENEWED', 'NOT_RENEWING'].includes(status) ? now : null,
      nextFollowUpAt,
    },
    update: {
      status,
      ownerUserId: user.id,
      note: note || null,
      lastContactedAt: ['CONTACTED', 'RENEWED', 'NOT_RENEWING'].includes(status) ? now : undefined,
      nextFollowUpAt,
    },
  })
  await db.activityLog.create({
    data: {
      userId: user.id,
      action: '更新续费跟进',
      detail: `${studentId} · ${status}`,
      entityType: 'RenewalFollowUp',
      entityId: followUp.id,
    },
  })
  return NextResponse.json({ followUp }, { status: 201 })
})
