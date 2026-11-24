import { describe, expect, it } from 'vitest'
import { isParentUnreadCountsCacheKey } from './parent-unread-cache'

describe('parent unread SWR cache key', () => {
  it('matches the user-scoped tuple key used by the parent layouts', () => {
    expect(isParentUnreadCountsCacheKey(['/api/parent/unread-counts', 'parent-1'])).toBe(true)
  })

  it('also matches the legacy string key and rejects unrelated caches', () => {
    expect(isParentUnreadCountsCacheKey('/api/parent/unread-counts')).toBe(true)
    expect(isParentUnreadCountsCacheKey(['/api/messages/unread-count', 'parent-1'])).toBe(false)
    expect(isParentUnreadCountsCacheKey(null)).toBe(false)
  })
})
