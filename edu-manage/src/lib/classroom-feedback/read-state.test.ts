import { describe, expect, it } from 'vitest'
import { projectParentFeedbackReadState, resolveParentFeedbackReadAt } from './read-state'

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

describe('projectParentFeedbackReadState', () => {
  const createdAt = new Date('2026-10-01T10:00:00.000Z')
  const readAt = new Date('2026-10-01T11:00:00.000Z')

  it('projects this parent’s read receipt onto the detail feedback', () => {
    const feedback = projectParentFeedbackReadState(
      { id: 'feedback-1', parentReadAt: null },
      [{ read: true, readAt, createdAt }],
    )

    expect(feedback.parentReadAt).toBe(readAt)
  })

  it('keeps the detail unread when only the shared legacy field says read', () => {
    const legacyReadAt = new Date('2026-09-30T09:00:00.000Z')
    const feedback = projectParentFeedbackReadState(
      { id: 'feedback-1', parentReadAt: legacyReadAt },
      [],
    )

    expect(feedback.parentReadAt).toBeNull()
  })
})
