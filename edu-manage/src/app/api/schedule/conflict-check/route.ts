import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { getLocalDayRange } from '@/lib/date/local-day'

export const dynamic = 'force-dynamic'

function hasTimeOverlap(startA?: string | null, endA?: string | null, startB?: string | null, endB?: string | null) {
  if (!startA || !endA || !startB || !endB) return false
  return startA < endB && endA > startB
}

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'SUPER_ADMIN', 'teacher'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const prisma = await getRequestPrisma()
  const body = await req.json().catch(() => ({}))
  const { date, startTime, endTime, teacherId, roomId, excludeLessonId } = body

  if (!date || !startTime || !endTime) {
    return NextResponse.json({ hasConflict: false, conflicts: [] })
  }

  let dayRange
  try {
    dayRange = getLocalDayRange(date)
  } catch {
    return NextResponse.json({ hasConflict: false, conflicts: [] })
  }

  const existingLessons = await prisma.classLesson.findMany({
    where: {
      lessonDate: { gte: dayRange.start, lt: dayRange.end },
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      deletedAt: null,
      ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
      OR: [
        ...(teacherId ? [{ teacherId }] : []),
        ...(roomId ? [{ group: { roomId } }] : []),
      ],
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      teacherId: true,
      teacher: { select: { id: true, name: true } },
      group: {
        select: {
          id: true,
          name: true,
          roomId: true,
          room: { select: { name: true } },
        },
      },
    },
  })

  const conflicts: Array<{
    type: 'TEACHER' | 'ROOM'
    desc: string
    groupName: string
    time: string
  }> = []

  for (const lesson of existingLessons) {
    if (!hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) continue

    if (teacherId && lesson.teacherId === teacherId) {
      conflicts.push({
        type: 'TEACHER',
        desc: `${lesson.teacher?.name || '该教师'}在此时段已有授课安排`,
        groupName: lesson.group.name,
        time: `${lesson.startTime}-${lesson.endTime}`,
      })
    } else if (roomId && lesson.group.roomId === roomId) {
      conflicts.push({
        type: 'ROOM',
        desc: `${lesson.group.room?.name || '该教室'}在此时段已被占用`,
        groupName: lesson.group.name,
        time: `${lesson.startTime}-${lesson.endTime}`,
      })
    }
  }

  return NextResponse.json({
    hasConflict: conflicts.length > 0,
    conflicts,
  })
})
