import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { getLocalDayRange } from '@/lib/date/local-day'
import { startOfWeek, endOfWeek } from 'date-fns'
import { LessonStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { searchParams } = new URL(req.url)
  const division = getRequestDivision(user, searchParams.get('division'))
  const selectedTerm = user.role === 'admin'
    ? await resolveAdminTermScope(prisma, division, req)
    : await getActiveAcademicTerm(prisma, division)

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const weekStartStr = `${weekStart.getFullYear()}-${pad(weekStart.getMonth() + 1)}-${pad(weekStart.getDate())}`
  const weekEndStr = `${weekEnd.getFullYear()}-${pad(weekEnd.getMonth() + 1)}-${pad(weekEnd.getDate())}`

  const dayRange = getLocalDayRange(todayStr)
  const weekStartRange = getLocalDayRange(weekStartStr)
  const weekEndRange = getLocalDayRange(weekEndStr)

  const termFilter = { group: { termId: selectedTerm?.id || '__NO_SELECTED_TERM__' } }
  const baseWhere = { division, deletedAt: null }
  const activeWhere = { ...baseWhere, status: { notIn: ['CANCELLED', 'POSTPONED'] as LessonStatus[] } }
  const cancelledWhere = { ...baseWhere, status: { in: ['CANCELLED', 'POSTPONED'] as LessonStatus[] } }

  const [todayTotal, todayCancelled, weekTotal, weekCancelled, weekRooms, weekTeachers, runningGroups] = await Promise.all([
    prisma.classLesson.count({ where: { ...activeWhere, ...termFilter, lessonDate: { gte: dayRange.start, lt: dayRange.end } } }),
    prisma.classLesson.count({ where: { ...cancelledWhere, ...termFilter, lessonDate: { gte: dayRange.start, lt: dayRange.end } } }),
    prisma.classLesson.count({ where: { ...activeWhere, ...termFilter, lessonDate: { gte: weekStartRange.start, lt: weekEndRange.end } } }),
    prisma.classLesson.count({ where: { ...cancelledWhere, ...termFilter, lessonDate: { gte: weekStartRange.start, lt: weekEndRange.end } } }),
    prisma.classLesson.findMany({
      where: { ...activeWhere, ...termFilter, lessonDate: { gte: weekStartRange.start, lt: weekEndRange.end } },
      include: { group: { select: { room: { select: { name: true } } } } },
    }),
    prisma.classLesson.findMany({
      where: { ...activeWhere, ...termFilter, lessonDate: { gte: weekStartRange.start, lt: weekEndRange.end } },
      select: { teacherId: true },
    }),
    prisma.classGroup.count({
      where: { division, deletedAt: null, status: { notIn: ['ARCHIVED'] }, termId: selectedTerm?.id || '__NO_SELECTED_TERM__' },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      todayTotal,
      todayCancelled,
      weekTotal,
      weekCancelled,
      activeRooms: new Set(weekRooms.map((r) => r.group?.room?.name).filter((n): n is string => Boolean(n))).size,
      weekTeachers: new Set(weekTeachers.map((t) => t.teacherId)).size,
      runningGroups,
    },
  })
})
