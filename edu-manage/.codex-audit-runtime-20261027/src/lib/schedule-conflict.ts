import { getRequestPrisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'

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
  termId?: string
}

export interface ConflictInfo {
  type: 'teacher' | 'student' | 'room'
  message: string
  lessonId: string
  courseName: string
  timeRange: string
  roomName?: string
}

type ScheduleConflictPrisma = Pick<PrismaClient, 'classLesson'>

export async function checkScheduleConflict(input: ConflictCheckInput, prismaClient?: ScheduleConflictPrisma): Promise<ConflictInfo[]> {
  const prisma = prismaClient ?? await getRequestPrisma()
  const { teacherId, studentId, roomId, date, startTime, endTime, excludeLessonId, termId } = input

  const { start: dayStart, end: dayEnd } = getLocalDayRange(date)

  const whereBase: Record<string, unknown> = {
    lessonDate: { gte: dayStart, lt: dayEnd },
    status: { not: 'CANCELLED' },
    deletedAt: null,
    group: { deletedAt: null },
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
      group: { deletedAt: null, ...(termId ? { termId } : {}) },
    },
    include: {
      group: { include: { course: { select: { name: true } }, room: { select: { name: true } } } },
      teacher: { select: { name: true } },
    },
  })

  for (const lesson of teacherLessons) {
    if (lesson.id === excludeLessonId) continue
    if (localDateKey(lesson.lessonDate) !== date) continue
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
        group: {
          deletedAt: null,
          ...(termId ? { termId } : {}),
          enrollments: { some: { studentId, status: 'ACTIVE', deletedAt: null } },
        },
      },
      include: {
        group: { include: { course: { select: { name: true } }, room: { select: { name: true } } } },
        teacher: { select: { name: true } },
      },
    })

    for (const lesson of studentLessons) {
      if (lesson.id === excludeLessonId) continue
      if (localDateKey(lesson.lessonDate) !== date) continue
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
        group: { roomId, deletedAt: null, ...(termId ? { termId } : {}) },
      },
      include: {
        group: { include: { course: { select: { name: true } }, room: { select: { name: true } } } },
        teacher: { select: { name: true } },
      },
    })

    for (const lesson of roomLessons) {
      if (lesson.id === excludeLessonId) continue
      if (localDateKey(lesson.lessonDate) !== date) continue
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

export interface StudentLessonConflict {
  studentName: string
  courseName: string
  timeRange: string
  lessonId: string
}

/**
 * 批量学生维度冲突检测：给定学生集合在目标时段内是否已有其他课程。
 * 与调课/新建课共用，供 class-lessons/[id] PATCH 在学生维度拦截。
 */
export async function findStudentLessonConflicts(
  prismaClient: ScheduleConflictPrisma,
  params: {
    studentIds: string[]
    date: Date
    startTime: string
    endTime: string
    excludeLessonId?: string
    termId?: string
  },
): Promise<StudentLessonConflict[]> {
  const { studentIds, date, startTime, endTime, excludeLessonId, termId } = params
  if (!studentIds.length) return []

  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const lessons = await prismaClient.classLesson.findMany({
    where: {
      ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
      lessonDate: { gte: dayStart, lt: dayEnd },
      status: { not: 'CANCELLED' },
      deletedAt: null,
      group: {
        deletedAt: null,
        ...(termId ? { termId } : {}),
        enrollments: { some: { studentId: { in: studentIds }, status: 'ACTIVE', deletedAt: null } },
      },
    },
    include: {
      group: {
        include: {
          course: { select: { name: true } },
          enrollments: {
            where: { studentId: { in: studentIds }, status: 'ACTIVE' },
            include: { student: { select: { id: true, name: true } } },
          },
        },
      },
    },
  })

  const conflicts: StudentLessonConflict[] = []
  for (const lesson of lessons) {
    if (!hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) continue
    for (const enrollment of lesson.group.enrollments) {
      conflicts.push({
        studentName: enrollment.student.name,
        courseName: lesson.group.course?.name || '-',
        timeRange: `${lesson.startTime}-${lesson.endTime}`,
        lessonId: lesson.id,
      })
    }
  }
  return conflicts
}

