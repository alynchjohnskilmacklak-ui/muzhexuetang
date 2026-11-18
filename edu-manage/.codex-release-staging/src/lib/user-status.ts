export type NormalizedUserStatus = 'ACTIVE' | 'DISABLED'

export const USER_ACTIVE_STORAGE_VALUES = ['active', 'ACTIVE'] as const
export const USER_DISABLED_STORAGE_VALUES = [
  'disabled',
  'DISABLED',
  'inactive',
  'INACTIVE',
] as const

const SUPPORTED_VALUES = new Set<string>([
  ...USER_ACTIVE_STORAGE_VALUES,
  ...USER_DISABLED_STORAGE_VALUES,
])

/**
 * Normalize legacy User.status values without changing stored production data.
 * Unknown or missing values fail closed so they cannot accidentally gain access.
 */
export function normalizeUserStatus(value: unknown): NormalizedUserStatus {
  if (typeof value !== 'string') return 'DISABLED'
  return value.trim().toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'DISABLED'
}

export function isSupportedUserStatus(value: unknown): value is string {
  return typeof value === 'string' && SUPPORTED_VALUES.has(value.trim())
}

export function isUserActive(value: unknown): boolean {
  return normalizeUserStatus(value) === 'ACTIVE'
}

export function isUserDisabled(value: unknown): boolean {
  return normalizeUserStatus(value) === 'DISABLED'
}

export function toStoredUserStatus(value: unknown): 'active' | 'disabled' {
  return normalizeUserStatus(value) === 'ACTIVE' ? 'active' : 'disabled'
}
