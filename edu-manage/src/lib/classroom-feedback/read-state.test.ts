import { describe, expect, it } from 'vitest'
import { resolveParentFeedbackReadAt } from './read-state'

describe('resolveParentFeedbackReadAt', () => {
  const createdAt = new Date('2026-10-01T10:00:00.000Z')
  const readAt = new Date('2026-10-01T11:00:00.000Z')

  it('does not inherit a shared legacy read state when no personal receipt exists', () => {
    expect(resolveParentFeedbackReadAt(readAt, [])).toBeNull()
    expect(resolveParentFeedbackReadAt(null, [])).toBeNull()
  })

  it('keeps feedback unread when any notification for this parent is unread', () => {
    expect(resolveParentFeedbackReadAt(readAt, [
      { read: true, readAt, createdAt },
      { read: false, readAt: null, createdAt },
    ])).toBeNull()
  })

  it('uses the latest personal read receipt when all are read', () => {
    const laterReadAt = new Date('2026-10-01T12:00:00.000Z')
    expect(resolveParentFeedbackReadAt(null, [
      { read: true, readAt, createdAt },
      { read: true, readAt: laterReadAt, createdAt },
    ])).toBe(laterReadAt)
  })
})
