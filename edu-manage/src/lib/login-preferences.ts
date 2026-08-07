'use client'

export type RememberedLoginRole = 'admin' | 'teacher' | 'parent'
export type RememberedLoginDivision = 'JUNIOR' | 'SENIOR'

export interface RememberedLoginPreference {
  email: string
  role: RememberedLoginRole
  division: RememberedLoginDivision
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const LOGIN_PREFERENCE_KEY = 'muzhe_login_preference_v1'
const LOGIN_ROLES = new Set<RememberedLoginRole>(['admin', 'teacher', 'parent'])
const LOGIN_DIVISIONS = new Set<RememberedLoginDivision>(['JUNIOR', 'SENIOR'])

function browserStorage(): StorageLike | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

export function parseLoginPreference(raw: string | null): RememberedLoginPreference | null {
  if (!raw) return null

  try {
    const value = JSON.parse(raw) as Partial<RememberedLoginPreference>
    const email = typeof value.email === 'string' ? value.email.trim().toLowerCase() : ''
    if (!email || !email.includes('@')) return null
    if (!value.role || !LOGIN_ROLES.has(value.role)) return null
    if (!value.division || !LOGIN_DIVISIONS.has(value.division)) return null
    return { email, role: value.role, division: value.division }
  } catch {
    return null
  }
}

export function readLoginPreference(storage: StorageLike | null = browserStorage()): RememberedLoginPreference | null {
  if (!storage) return null
  const preference = parseLoginPreference(storage.getItem(LOGIN_PREFERENCE_KEY))
  if (!preference) storage.removeItem(LOGIN_PREFERENCE_KEY)
  return preference
}

export function writeLoginPreference(
  preference: RememberedLoginPreference,
  storage: StorageLike | null = browserStorage(),
): void {
  if (!storage) return
  storage.setItem(LOGIN_PREFERENCE_KEY, JSON.stringify({
    email: preference.email.trim().toLowerCase(),
    role: preference.role,
    division: preference.division,
  }))
}

export function clearLoginPreference(storage: StorageLike | null = browserStorage()): void {
  storage?.removeItem(LOGIN_PREFERENCE_KEY)
}

/**
 * Hands credentials to the browser/OS password manager when that secure API is
 * available. The application never writes the password to localStorage,
 * sessionStorage, cookies, logs, or the database in plaintext.
 */
export async function offerPasswordManagerSave(email: string, password: string): Promise<void> {
  if (typeof window === 'undefined' || !window.isSecureContext || !navigator.credentials?.store) return

  const PasswordCredentialCtor = (window as typeof window & {
    PasswordCredential?: new (data: { id: string; password: string; name?: string }) => Credential
  }).PasswordCredential
  if (!PasswordCredentialCtor) return

  try {
    await navigator.credentials.store(new PasswordCredentialCtor({
      id: email.trim().toLowerCase(),
      password,
      name: email.trim().toLowerCase(),
    }))
  } catch {
    // Unsupported or user-declined password-manager prompts must not block login.
  }
}
