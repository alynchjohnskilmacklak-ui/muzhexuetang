export type Division = 'JUNIOR' | 'SENIOR'
export type WritableDivision = 'JUNIOR' | 'SENIOR'

export const DIVISION_OPTIONS: Array<{ value: Division; label: string }> = [
  { value: 'JUNIOR', label: '初中部' },
  { value: 'SENIOR', label: '高中部' },
]

export function normalizeWritableDivision(value: unknown, fallback: WritableDivision = 'JUNIOR'): WritableDivision {
  return value === 'SENIOR' ? 'SENIOR' : value === 'JUNIOR' ? 'JUNIOR' : fallback
}

export function divisionWhere(value: unknown): { division?: WritableDivision } {
  return value === 'JUNIOR' || value === 'SENIOR' ? { division: value } : {}
}

/** Returns the effective division from the session user.
 *  Always returns JUNIOR or SENIOR. */
export function getRequestDivision(
  sessionUser: { division?: string | null } | null | undefined,
  _requestedDivision?: string | null,
): WritableDivision {
  if (!sessionUser) throw new Error('UNAUTHORIZED')
  return sessionUser.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
}
