export type Division = 'JUNIOR' | 'SENIOR' | 'ALL'
export type WritableDivision = 'JUNIOR' | 'SENIOR'

export const DIVISION_OPTIONS: Array<{ value: Division; label: string }> = [
  { value: 'JUNIOR', label: '初中部' },
  { value: 'SENIOR', label: '高中部' },
  { value: 'ALL', label: '全部' },
]

export function normalizeDivision(value: unknown): Division {
  return value === 'JUNIOR' || value === 'SENIOR' || value === 'ALL' ? value : 'ALL'
}

export function normalizeWritableDivision(value: unknown, fallback: WritableDivision = 'JUNIOR'): WritableDivision {
  return value === 'SENIOR' ? 'SENIOR' : value === 'JUNIOR' ? 'JUNIOR' : fallback
}

export function divisionWhere(value: unknown): { division?: WritableDivision } {
  const division = normalizeDivision(value)
  return division === 'ALL' ? {} : { division }
}

/** Returns the effective division for this request.
 *  Super admins (division=ALL) may use requestedDivision (defaults to selectedDivision).
 *  Regular users are locked to their own division.
 *  Always returns JUNIOR or SENIOR, never ALL (ALL means "no filter" which is a leak). */
export function getRequestDivision(
  sessionUser: { role?: string; division?: string | null; selectedDivision?: string } | null | undefined,
  requestedDivision?: string | null,
): WritableDivision {
  if (!sessionUser) throw new Error('UNAUTHORIZED')

  const userDiv = sessionUser.division || 'JUNIOR'
  const selectedDiv = sessionUser.selectedDivision || 'JUNIOR'

  if (userDiv === 'ALL') {
    const req = requestedDivision || selectedDiv
    return req === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
  }

  // Regular user: locked to own division
  return userDiv === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
}
