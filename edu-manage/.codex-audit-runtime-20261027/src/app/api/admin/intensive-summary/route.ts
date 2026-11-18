import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const division = getRequestDivision(admin)
  const term = await resolveAdminTermScope(admin.prisma, division, request)
  const group = { ...visibleClassGroupWhere, division, termId: term?.id || '__NO_SELECTED_TERM__', course: { isActive: true, deletedAt: null, type: { in: ['ONE_ON_ONE', 'SMALL_GROUP'] as ('ONE_ON_ONE' | 'SMALL_GROUP')[] } } }
  const today = getLocalDayRange(todayLocal()).start
  const weekday = new Date(today.getTime() + 8 * 3600000).getUTCDay()
  const weekStart = new Date(today.getTime() - ((weekday + 6) % 7) * 86400000)
  const monthStart = getLocalDayRange(todayLocal().slice(0, 7) + '-01').start
  const lesson = { division, deletedAt: null, group }
  const [enrollments, weekAppointments, pendingLessons, monthHours] = await Promise.all([
    admin.prisma.enrollment.findMany({ where: { group, status: 'ACTIVE', deletedAt: null, student: visibleStudentWhere }, distinct: ['studentId'], select: { studentId: true } }),
    admin.prisma.classLesson.count({ where: { ...lesson, status: { notIn: ['CANCELLED', 'POSTPONED'] }, lessonDate: { gte: weekStart, lt: new Date(weekStart.getTime() + 7 * 86400000) } } }),
    admin.prisma.classLesson.count({ where: { ...lesson, status: { notIn: ['COMPLETED', 'CANCELLED', 'POSTPONED'] } } }),
    admin.prisma.classLesson.count({ where: { ...lesson, status: 'COMPLETED', lessonDate: { gte: monthStart, lte: new Date() } } }),
  ])
  return NextResponse.json({ vipStudents: enrollments.length, weekAppointments, pendingLessons, monthHours })
})
