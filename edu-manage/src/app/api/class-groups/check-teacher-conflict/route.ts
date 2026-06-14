import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { hasTimeOverlap } from '@/lib/schedule-conflict'
import { divisionWhere } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { teacherId, date, startTime, endTime, division } = await req.json()

  if (!teacherId || !date || !startTime || !endTime) {
    return NextResponse.json({ conflict: false })
  }

  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(`${date}T23:59:59`)
  const divFilter = divisionWhere(division)

  const lessons = await prisma.classLesson.findMany({
    where: {
      teacherId,
      lessonDate: { gte: dayStart, lte: dayEnd },
      status: { not: 'CANCELLED' },
      ...divFilter,
    },
    include: {
      group: { include: { course: { select: { name: true } } } },
    },
  })

  for (const lesson of lessons) {
    if (hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
      return NextResponse.json({
        conflict: true,
        conflictDetail: `${lesson.group?.course?.name || '某班'} ${lesson.startTime}-${lesson.endTime}`,
      })
    }
  }

  const groupTeacherLessons = await prisma.classLesson.findMany({
    where: {
      lessonDate: { gte: dayStart, lte: dayEnd },
      status: { not: 'CANCELLED' },
      group: {
        teacherAssignments: { some: { teacherId } },
      },
    },
    include: {
      group: { include: { course: { select: { name: true } } } },
    },
  })

  for (const lesson of groupTeacherLessons) {
    if (hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
      return NextResponse.json({
        conflict: true,
        conflictDetail: `${lesson.group?.course?.name || '某班'} ${lesson.startTime}-${lesson.endTime}（兼任教师）`,
      })
    }
  }

  return NextResponse.json({ conflict: false })
})
