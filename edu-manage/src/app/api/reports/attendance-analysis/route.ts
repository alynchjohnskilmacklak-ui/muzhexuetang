import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getPrismaForDivision, getRequestPrisma, isDualDbEnabled } from '@/lib/prisma'
import { requireFeeAdminScope } from '@/lib/fee-admin-scope'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { analyzeAttendance } from '@/lib/attendance-analysis'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const scope = await requireFeeAdminScope(request.nextUrl.searchParams.get('division'))
  const allDivisions = scope.division === 'all'
  const divisions = allDivisions && isDualDbEnabled() ? ['JUNIOR', 'SENIOR'] : [allDivisions ? scope.user.division : scope.division]
  const byDivision = await Promise.all(divisions.map(async (division) => {
    const prisma = isDualDbEnabled() ? getPrismaForDivision(division as 'JUNIOR' | 'SENIOR') : await getRequestPrisma()
    const term = allDivisions
      ? await prisma.academicTerm.findFirst({ where: { division, status: 'ACTIVE' }, orderBy: { startDate: 'desc' } })
      : await resolveAdminTermScope(prisma, division, request)
    if (!term) return { division, result: { trend: [], consecutiveAbsences: [] } }
    const from = new Date(); from.setDate(from.getDate() - 120); from.setHours(0,0,0,0)
    const rows = await prisma.attendance.findMany({
      where: { deletedAt: null, lesson: { deletedAt: null, lessonDate: { gte: from, lte: new Date() }, group: { termId: term.id, division } }, student: { division, deletedAt: null } },
      select: { studentId: true, status: true, student: { select: { name: true } }, lesson: { select: { lessonDate: true, group: { select: { name: true } } } } },
      orderBy: { lesson: { lessonDate: 'desc' } },
      take: 30_000,
    })
    return { division, result: analyzeAttendance(rows.flatMap(row => row.lesson ? [{ studentId: row.studentId, studentName: row.student.name, groupName: row.lesson.group.name, status: row.status, lessonDate: row.lesson.lessonDate }] : [])) }
  }))
  const trendByWeek = new Map<string, { present: number; absent: number; leave: number; total: number }>()
  for (const { result } of byDivision) for (const item of result.trend) {
    const current = trendByWeek.get(item.week) || { present: 0, absent: 0, leave: 0, total: 0 }
    current.present += item.present; current.absent += item.absent; current.leave += item.leave; current.total += item.total
    trendByWeek.set(item.week, current)
  }
  const trend = [...trendByWeek].sort(([a], [b]) => a.localeCompare(b)).map(([week, values]) => ({ ...values, week, attendanceRate: values.total ? Math.round(values.present / values.total * 100) : 0 }))
  const consecutiveAbsences = byDivision.flatMap(({ division, result }) => result.consecutiveAbsences.map(item => ({ ...item, division }))).sort((a,b)=>b.streak-a.streak)
  return NextResponse.json({ trend, consecutiveAbsences }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
})
