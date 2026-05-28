import { prisma } from '@/lib/prisma'

export function hasTimeOverlap(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string
): boolean {
  return newStart < existingEnd && newEnd > existingStart
}

export interface ConflictCheckInput {
  teacherId: string
  studentId?: string
  roomId?: string
  date: string
  startTime: string
  endTime: string
  excludeLessonId?: string
}

export interface ConflictInfo {
  type: 'teacher' | 'student' | 'room'
  message: string
  lessonId: string
  courseName: string
  timeRange: string
  roomName?: string
}

export async function checkScheduleConflict(input: ConflictCheckInput): Promise<ConflictInfo[]> {
  const { teacherId, studentId, roomId, date, startTime, endTime, excludeLessonId } = input

  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(`${date}T23:59:59`)

  const whereBase: Record<string, unknown> = {
    lessonDate: { gte: dayStart, lte: dayEnd },
    status: { not: 'CANCELLED' },
  }
  if (excludeLessonId) {
    whereBase.id = { not: excludeLessonId }
  }

  const conflicts: ConflictInfo[] = []

  // Teacher conflict check — only check lesson.teacherId (not group assignments)
  const teacherLessons = await prisma.classLesson.findMany({
    where: {
      ...whereBase,
      teacherId,
    },
    include: {
      group: { include: { course: { select: { name: true } }, room: { select: { name: true } } } },
      teacher: { select: { name: true } },
    },
  })

  for (const lesson of teacherLessons) {
    if (lesson.id === excludeLessonId) continue
    if (hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
      conflicts.push({
        type: 'teacher',
        message: '该老师在此时间段已有课程',
        lessonId: lesson.id,
        courseName: lesson.group?.course?.name || '-',
        timeRange: `${lesson.startTime}-${lesson.endTime}`,
        roomName: lesson.group?.room?.name || undefined,
      })
    }
  }

  // Student conflict check
  if (studentId) {
    const studentLessons = await prisma.classLesson.findMany({
      where: {
        ...whereBase,
        group: { enrollments: { some: { studentId, status: 'ACTIVE' } } },
      },
      include: {
        group: { include: { course: { select: { name: true } }, room: { select: { name: true } } } },
        teacher: { select: { name: true } },
      },
    })

    for (const lesson of studentLessons) {
      if (lesson.id === excludeLessonId) continue
      if (hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
        conflicts.push({
          type: 'student',
          message: '该学员在此时间段已有课程',
          lessonId: lesson.id,
          courseName: lesson.group?.course?.name || '-',
          timeRange: `${lesson.startTime}-${lesson.endTime}`,
          roomName: lesson.group?.room?.name || undefined,
        })
      }
    }
  }

  // Room conflict check (only if roomId is provided and not empty)
  if (roomId && roomId.trim() !== '') {
    const roomLessons = await prisma.classLesson.findMany({
      where: {
        ...whereBase,
        group: { roomId },
      },
      include: {
        group: { include: { course: { select: { name: true } }, room: { select: { name: true } } } },
        teacher: { select: { name: true } },
      },
    })

    for (const lesson of roomLessons) {
      if (lesson.id === excludeLessonId) continue
      if (hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
        conflicts.push({
          type: 'room',
          message: '该教室在此时间段已被占用',
          lessonId: lesson.id,
          courseName: lesson.group?.course?.name || '-',
          timeRange: `${lesson.startTime}-${lesson.endTime}`,
          roomName: lesson.group?.room?.name || undefined,
        })
      }
    }
  }

  return conflicts
}
