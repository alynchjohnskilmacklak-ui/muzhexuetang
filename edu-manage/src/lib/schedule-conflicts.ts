import type { Prisma, PrismaClient } from '@prisma/client'

export interface ScheduleConflict {
  id: string
  title: string
  startTime: string
  endTime: string
  teacherName: string
  roomName?: string
  type: 'teacher' | 'room' | 'student'
}

export interface CheckScheduleConflictsInput {
  teacherId: string
  roomId?: string | null
  studentIds?: string[]
  startTime: Date
  endTime: Date
  excludeScheduleId?: string
  tx?: Prisma.TransactionClient
  prismaClient?: PrismaClient
}

export async function checkScheduleConflicts({
  teacherId,
  roomId,
  studentIds,
  startTime,
  endTime,
  excludeScheduleId,
  tx,
  prismaClient,
}: CheckScheduleConflictsInput): Promise<ScheduleConflict[]> {
  const db = tx ?? prismaClient
  if (!db) throw new Error('schedule-conflicts: must provide tx or prismaClient')
  const conflicts: ScheduleConflict[] = []
  const exclude = excludeScheduleId ? { id: { not: excludeScheduleId } } : {}
  const timeFilter = {
    status: { not: 'cancelled' } as const,
    startTime: { lt: endTime },
    endTime: { gt: startTime },
  }

  // Teacher conflict
  const teacherSchedules = await db.schedule.findMany({
    where: { teacherId, ...timeFilter, ...exclude },
    include: {
      teacher: { select: { name: true } },
      room: { select: { name: true } },
    },
  })

  for (const s of teacherSchedules) {
    conflicts.push({
      id: s.id,
      title: s.title,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      teacherName: s.teacher.name,
      roomName: s.room?.name || undefined,
      type: 'teacher',
    })
  }

  // Room conflict
  if (roomId) {
    const roomSchedules = await db.schedule.findMany({
      where: { roomId, ...timeFilter, ...exclude },
      include: {
        teacher: { select: { name: true } },
        room: { select: { name: true } },
      },
    })

    for (const s of roomSchedules) {
      if (!conflicts.some(c => c.id === s.id)) {
        conflicts.push({
          id: s.id,
          title: s.title,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          teacherName: s.teacher.name,
          roomName: s.room?.name || undefined,
          type: 'room',
        })
      }
    }
  }

  // Student conflict
  if (studentIds && studentIds.length > 0) {
    const studentSchedules = await db.schedule.findMany({
      where: {
        ...timeFilter,
        ...exclude,
        students: { some: { studentId: { in: studentIds } } },
      },
      include: {
        teacher: { select: { name: true } },
        room: { select: { name: true } },
      },
    })

    for (const s of studentSchedules) {
      if (!conflicts.some(c => c.id === s.id)) {
        conflicts.push({
          id: s.id,
          title: s.title,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          teacherName: s.teacher.name,
          roomName: s.room?.name || undefined,
          type: 'student',
        })
      }
    }
  }

  return conflicts
}
