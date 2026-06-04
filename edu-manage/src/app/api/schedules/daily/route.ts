import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { CLASS_PERIODS_ONLY, getPeriodId } from '@/lib/schedule-periods'
import { activeEnrollmentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const courseType = searchParams.get('courseType') || ''

  const dayStart = new Date(`${dateStr}T00:00:00`)
  const dayEnd = new Date(`${dateStr}T23:59:59`)

  const where: Record<string, unknown> = {
    lessonDate: { gte: dayStart, lte: dayEnd },
    status: { not: 'CANCELLED' },
  }
  if (courseType === 'GROUP') {
    where.group = { course: { type: 'GROUP' } }
  } else if (courseType === 'SMALL') {
    where.group = { course: { type: { in: ['ONE_ON_ONE', 'SMALL_GROUP'] } } }
  }

  const lessons = await prisma.classLesson.findMany({
    where,
    include: {
      teacher: { select: { id: true, name: true, subjects: true } },
      group: {
        include: {
          course: { select: { id: true, name: true, subject: true, grade: true, type: true } },
          room: { select: { id: true, name: true, capacity: true, type: true } },
          enrollments: { where: activeEnrollmentWhere, select: { id: true } },
        },
      },
    },
    orderBy: [{ startTime: 'asc' }],
  })

  const matrix: Record<string, Record<string, Record<string, unknown>[]>> = {}

  for (const lesson of lessons) {
    const roomId = lesson.group?.room?.id || 'unknown'
    let periodId = getPeriodId(lesson.startTime)
    if (!periodId) {
      const [lessonHour, lessonMinute = 0] = lesson.startTime.split(':').map(Number)
      const startMin = lessonHour * 60 + lessonMinute
      const within = CLASS_PERIODS_ONLY.find((period) => {
        const [periodHour, periodMinute = 0] = period.start.split(':').map(Number)
        const [endHour, endMinute = 0] = period.end.split(':').map(Number)
        return periodHour * 60 + periodMinute <= startMin && startMin < endHour * 60 + endMinute
      })
      if (within) periodId = within.id
    }
    if (!periodId) continue

    if (!matrix[roomId]) matrix[roomId] = {}
    if (!matrix[roomId][periodId]) matrix[roomId][periodId] = []

    matrix[roomId][periodId].push({
      lessonId: lesson.id,
      teacherName: lesson.teacher?.name || '未分配',
      teacherId: lesson.teacherId,
      courseName: lesson.group?.course?.name || '',
      subject: lesson.subject || lesson.group?.course?.subject || '',
      grade: lesson.group?.course?.grade || '',
      courseType: lesson.group?.course?.type || 'GROUP',
      headcount: lesson.group?.enrollments?.length || 0,
      startTime: lesson.startTime,
    })
  }

  return NextResponse.json({ date: dateStr, matrix })
})
