import { describe, expect, it } from 'vitest'
import {
  parentUnreadClassroomFeedbackWhere,
  standaloneParentNotificationWhere,
  sumParentUnreadItems,
} from './parent-unread'

describe('parent unread counters', () => {
  it('uses the feedback read receipt as the unread source of truth', () => {
    expect(parentUnreadClassroomFeedbackWhere('parent-1', ['student-1'])).toEqual({
      status: 'PUBLISHED',
      studentIds: { hasSome: ['student-1'] },
      OR: [
        { parentReadReceipts: { none: { parentUserId: 'parent-1' } } },
        { parentReadReceipts: { some: { parentUserId: 'parent-1', readAt: null } } },
      ],
    })
  })

  it('does not double-count notifications backed by a parent-visible source record', () => {
    expect(standaloneParentNotificationWhere).toEqual({
      NOT: {
        OR: [
          {
            relatedType: {
              in: [
                'CLASSROOM_FEEDBACK',
                'PERFORMANCE_FEEDBACK',
                'PERFORMANCE_UPDATE',
                'EXAM_PAPER',
                'PAPER_PUBLISHED',
                'PARENT_MESSAGE',
                'PARENT_MESSAGE_REPLY',
              ],
            },
          },
          {
            relatedType: null,
            type: {
              in: [
                'CLASSROOM_FEEDBACK',
                'PERFORMANCE_FEEDBACK',
                'PERFORMANCE_UPDATE',
                'EXAM_PAPER',
                'PAPER_PUBLISHED',
                'PARENT_MESSAGE',
                'PARENT_MESSAGE_REPLY',
              ],
            },
          },
        ],
      },
    })
  })

  it('sums each parent-visible unread source once', () => {
    expect(sumParentUnreadItems({ papers: 1, posts: 2, notifications: 3, feedbacks: 4, messages: 5 })).toBe(15)
  })
})
