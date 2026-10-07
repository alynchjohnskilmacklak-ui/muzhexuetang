import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { findSchedulePeriod, HOURLY_PERIODS, normalizeSchedulePeriods } from '@/lib/schedule-periods'
import { activeEnrollmentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { getLocalDayRange } from '@/lib/date/local-day'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()
  const config = await prisma.systemConfig.findUnique({ where: { id: 'singleton' }, select: { schedulePeriods: true } })
  const periods = normalizeSchedulePeriods(config?.schedulePeriods)

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const courseType = searchParams.get('courseType') || ''
  const division = getRequestDivision(user, searchParams.get('division'))
  const selectedTerm = user.role === 'admin'
    ? await resolveAdminTermScope(prisma, division, req)
    : await getActiveAcademicTerm(prisma, division)

  let dayStart: Date
  let dayEnd: Date
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error('invalid date')
    const range = getLocalDayRange(dateStr)
    dayStart = range.start
    dayEnd = range.end
  } catch {
    return NextResponse.json({ error: '日期格式不正确' }, { status: 400 })
  }

  const where: Record<string, unknown> = {
    division,
    lessonDate: { gte: dayStart, lt: dayEnd },
    status: { notIn: ['CANCELLED', 'POSTPONED'] },
    deletedAt: null,
    group: { termId: selectedTerm?.id || '__NO_SELECTED_TERM__' },
  }
  if (courseType === 'GROUP') {
    where.group = { ...(where.group as object), course: { type: 'GROUP' } }
  } else if (courseType === 'SMALL') {
    where.group = { ...(where.group as object), course: { type: { in: ['ONE_ON_ONE', 'SMALL_GROUP'] } } }
  }

  const lessons = await prisma.classLesson.findMany({
    where,
    include: {
      teacher: { select: { id: true, name: true, subjects: true } },
      group: {
        include: {
          course: { select: { id: true, name: true, subject: true, grade: true, type: true } },
          room: { select: { id: true, name: true, capacity: true, type: true } },
          teacher: { select: { id: true, name: true } },
          teacherAssignments: { select: { teacherId: true, subject: true, teacher: { select: { name: true } } } },
          enrollments: { where: activeEnrollmentWhere, select: { studentId: true, subjects: true } },
        },
      },
    },
    orderBy: [{ startTime: 'asc' }],
  })

  const matrix: Record<string, Record<string, Record<string, unknown>[]>> = {}
  const dailyLessons: Record<string, unknown>[] = []

  for (const lesson of lessons) {
    const roomId = lesson.group?.room?.id || 'unknown'
    const item = {
      id: lesson.id,
      lessonId: lesson.id,
      lessonDate: lesson.lessonDate,
      status: lesson.status,
      teacher: lesson.teacher,
      group: lesson.group,
      groupId: lesson.groupId,
      roomName: lesson.group?.room?.name || '未安排教室',
      teacherName: lesson.teacher?.name || '未分配',
      teacherId: lesson.teacherId,
      courseName: lesson.group?.course?.name || '',
      subject: lesson.subject || lesson.group?.course?.subject || '',
      grade: lesson.group?.course?.grade || '',
      courseType: lesson.group?.teachingType || lesson.group?.course?.type || 'GROUP',
      headcount: lesson.group?.enrollments?.filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, lesson.subject || lesson.group.course.subject)).length || 0,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    }
    dailyLessons.push(item)
    const periodId = findSchedulePeriod(periods, lesson.startTime)?.id
      || (courseType === 'SMALL' ? HOURLY_PERIODS.find((period) => period.start === lesson.startTime)?.id : null)
    if (!periodId) continue

    if (!matrix[roomId]) matrix[roomId] = {}
    if (!matrix[roomId][periodId]) matrix[roomId][periodId] = []

    matrix[roomId][periodId].push(item)
  }

  return NextResponse.json({ date: dateStr, lessons: dailyLessons, matrix, periods })
})
