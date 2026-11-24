/**
 * The parent unread summary is keyed by both endpoint and user id in SWR.
 * Detail pages do not all have that id in scope, so they must use this
 * predicate with mutate(filter) instead of mutating the endpoint string.
 */
export function isParentUnreadCountsCacheKey(key: unknown): boolean {
  if (key === '/api/parent/unread-counts') return true
  return Array.isArray(key) && key[0] === '/api/parent/unread-counts'
}
