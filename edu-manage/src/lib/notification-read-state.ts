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
