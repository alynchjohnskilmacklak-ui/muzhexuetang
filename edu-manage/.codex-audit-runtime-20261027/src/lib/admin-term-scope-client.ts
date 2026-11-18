const TERM_SCOPED_API_PREFIXES = [
  '/api/dashboard',
  '/api/students',
  '/api/teachers',
  '/api/class-groups',
  '/api/class-lessons',
  '/api/schedules',
  '/api/attendance',
  '/api/admin/classroom-feedback',
  '/api/admin/intensive-reviews',
  '/api/admin/salary',
  '/api/reports',
  '/api/study-hall',
] as const

/**
 * SWR keeps request results while navigating between admin pages. After the
 * operator changes the selected term, those results belong to the previous
 * term and must not be rendered in the new workspace.
 */
export function isAdminTermScopedSWRKey(key: unknown) {
  return typeof key === 'string'
    && TERM_SCOPED_API_PREFIXES.some((prefix) => key === prefix || key.startsWith(`${prefix}?`) || key.startsWith(`${prefix}/`))
}
