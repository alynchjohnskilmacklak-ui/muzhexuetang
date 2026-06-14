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
