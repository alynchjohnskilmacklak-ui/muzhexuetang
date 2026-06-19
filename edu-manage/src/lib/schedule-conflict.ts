import { getRequestPrisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

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

export async function checkScheduleConflict(input: ConflictCheckInput, prismaClient?: PrismaClient): Promise<ConflictInfo[]> {
  const prisma = prismaClient ?? await getRequestPrisma()
  const { teacherId, studentId, roomId, date, startTime, endTime, excludeLessonId } = input

  const dayStart = new Date(`${date}T00:00:00+08:00`)
  const dayEnd = new Date(`${date}T23:59:59+08:00`)

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
        message: `教师冲突：${lesson.teacher?.name || '未知'} 在 ${date} ${lesson.startTime}-${lesson.endTime} 已有【${lesson.group?.course?.name || '-'}】课程`,
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
          message: `学生冲突：该学员在 ${date} ${lesson.startTime}-${lesson.endTime} 已有【${lesson.group?.course?.name || '-'}】课程`,
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
          message: `教室冲突：${lesson.group?.room?.name || '该教室'} 在 ${date} ${lesson.startTime}-${lesson.endTime} 已被【${lesson.group?.course?.name || '-'}】占用`,
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
