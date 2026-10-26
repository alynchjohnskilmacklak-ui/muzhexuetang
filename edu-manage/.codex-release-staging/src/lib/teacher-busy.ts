import type { PrismaClient } from '@prisma/client'
import { hasTimeOverlap } from './schedule-conflict'

export interface BusySlot {
  source: 'lesson'
  label: string
  start: string
  end: string
}

/** Returns the first active ClassLesson that overlaps the requested time. */
export async function getTeacherBusy(
  prisma: PrismaClient,
  teacherId: string,
  dateStr: string,
  start: string,
  end: string,
): Promise<BusySlot | null> {
  const dayStart = new Date(`${dateStr}T00:00:00`)
  const dayEnd = new Date(`${dateStr}T23:59:59`)
  const lessons = await prisma.classLesson.findMany({
    where: {
      teacherId,
      lessonDate: { gte: dayStart, lte: dayEnd },
      status: { not: 'CANCELLED' },
      deletedAt: null,
      group: { deletedAt: null },
    },
    select: {
      startTime: true,
      endTime: true,
      group: { select: { course: { select: { name: true } } } },
    },
  })

  for (const lesson of lessons) {
    if (hasTimeOverlap(start, end, lesson.startTime, lesson.endTime)) {
      return {
        source: 'lesson',
        label: lesson.group?.course?.name || '班课',
        start: lesson.startTime,
        end: lesson.endTime,
      }
    }
  }
  return null
}
