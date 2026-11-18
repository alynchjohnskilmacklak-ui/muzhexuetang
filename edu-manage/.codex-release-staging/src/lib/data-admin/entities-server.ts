import { getRequestPrisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function createActivityLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  const prisma = await getRequestPrisma()
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      detail: `${action}: ${entityType} ${entityId}`,
      metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}

export async function createDeletedRecord(
  entityType: string,
  entityId: string,
  entityName: string | null,
  payload: unknown,
  deletedById: string,
  reason: string,
) {
  const prisma = await getRequestPrisma()
  await prisma.deletedRecord.create({
    data: {
      entityType,
      entityId,
      entityName,
      payload: JSON.parse(JSON.stringify(payload)),
      deletedById,
      reason,
    },
  })
}
