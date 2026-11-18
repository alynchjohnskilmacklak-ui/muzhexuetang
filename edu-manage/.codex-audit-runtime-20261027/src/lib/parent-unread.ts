import type { Prisma } from '@prisma/client'

/**
 * These unread notification rows point at records already counted by the
 * parent paper, performance-post, or classroom-feedback counters.
 */
const SOURCE_BACKED_NOTIFICATION_TYPES = [
  'CLASSROOM_FEEDBACK',
  'PERFORMANCE_FEEDBACK',
  'PERFORMANCE_UPDATE',
  'EXAM_PAPER',
  'PAPER_PUBLISHED',
] as const

/** Keep notifications without a relatedType unless their fallback type is source-backed. */
export const standaloneParentNotificationWhere = {
  NOT: {
    OR: [
      { relatedType: { in: [...SOURCE_BACKED_NOTIFICATION_TYPES] } },
      { relatedType: null, type: { in: [...SOURCE_BACKED_NOTIFICATION_TYPES] } },
    ],
  },
} satisfies Prisma.NotificationWhereInput

export function sumParentUnreadItems(input: {
  papers: number
  posts: number
  notifications: number
  feedbacks: number
  messages: number
}): number {
  return input.papers + input.posts + input.notifications + input.feedbacks + input.messages
}
