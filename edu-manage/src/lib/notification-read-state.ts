import type { Prisma } from '@prisma/client'

/**
 * `read` is the canonical compatibility flag used by current notification
 * lists and counters. `readAt` records when the state changed.
 *
 * Keeping both writes in one helper prevents the two fields drifting apart.
 */
export const unreadNotificationWhere = {
  read: false,
} satisfies Prisma.NotificationWhereInput

export function notificationReadData(readAt = new Date()) {
  return {
    read: true,
    readAt,
  } satisfies Prisma.NotificationUpdateInput
}

type LinkedNotificationUpdater = Pick<Prisma.TransactionClient['notification'], 'updateMany'>

/**
 * Mark a parent's notifications for a viewed business record as read.
 *
 * The href fallback repairs older notifications that were created before
 * relatedId was populated. It is always scoped to the authenticated parent
 * and to the record's known notification types.
 */
export async function markLinkedContentNotificationsRead(
  notification: LinkedNotificationUpdater,
  input: {
    userId: string
    relatedId: string
    relatedTypes: string[]
    readAt?: Date
    legacyHrefContains?: string
  },
) {
  const typeScope = [
    { relatedType: { in: input.relatedTypes } },
    { relatedType: null, type: { in: input.relatedTypes } },
  ] satisfies Prisma.NotificationWhereInput[]

  return notification.updateMany({
    where: {
      userId: input.userId,
      ...unreadNotificationWhere,
      status: { in: ['ACTIVE', 'ARCHIVED'] },
      deletedAt: null,
      OR: [
        { relatedId: input.relatedId, OR: typeScope },
        ...(input.legacyHrefContains
          ? [{ relatedId: null, type: { in: input.relatedTypes }, href: { contains: input.legacyHrefContains } }]
          : []),
      ],
    },
    data: notificationReadData(input.readAt),
  })
}
