import type { PrismaClient } from '@prisma/client'
import { getTeacherBusy } from '@/lib/teacher-busy'

export type TeacherConflictInput = {
  teacherId: string
  date: string
  startTime: string
  endTime: string
}

export async function checkTeacherConflict(prisma: PrismaClient, input: TeacherConflictInput) {
  const busy = await getTeacherBusy(
    prisma,
    input.teacherId,
    input.date,
    input.startTime,
    input.endTime,
  )
  return busy
    ? {
        conflict: true as const,
        conflictDetail: `${busy.label} ${busy.start}-${busy.end}`,
        source: busy.source,
      }
    : { conflict: false as const }
}
