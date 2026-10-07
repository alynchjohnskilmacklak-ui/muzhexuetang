import type { PrismaClient } from '@prisma/client'

export type ActiveRoomUsage = {
  classGroups: number
  total: number
}

/** ClassGroup is the single source of truth for room occupancy. */
export async function countActiveRoomUsage(prisma: PrismaClient, roomId: string): Promise<ActiveRoomUsage> {
  const classGroups = await prisma.classGroup.count({
    where: {
      roomId,
      status: { not: 'ARCHIVED' },
      deletedAt: null,
      course: { isActive: true, deletedAt: null },
    },
  })
  return { classGroups, total: classGroups }
}

export function activeRoomUsageMessage(usage: ActiveRoomUsage) {
  return `该教室仍被 ${usage.classGroups} 个班级使用，请先调整排课后再删除`
}
