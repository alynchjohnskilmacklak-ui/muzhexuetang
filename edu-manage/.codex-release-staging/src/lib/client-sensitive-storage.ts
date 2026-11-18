'use client'

const SENSITIVE_PREFIXES = [
  'muzhe_ai_conversations_',
  'performance:draft:',
  'teacher-feedback-draft:',
]

const LEGACY_KEYS = [
  'performance:draft',
  'teacher-feedback-draft-v1',
  'teacher-feedback-draft-v2',
]

type StoredValue<T> = {
  savedAt: number
  value: T
}

function isBrowser() {
  return typeof window !== 'undefined'
}

export function readSensitiveSessionValue<T>(key: string, maxAgeMs: number): T | null {
  if (!isBrowser()) return null
  const raw = window.sessionStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredValue<T>>
    if (typeof parsed.savedAt !== 'number' || !('value' in parsed)) throw new Error('invalid payload')
    if (Date.now() - parsed.savedAt > maxAgeMs) {
      window.sessionStorage.removeItem(key)
      return null
    }
    return parsed.value as T
  } catch {
    window.sessionStorage.removeItem(key)
    return null
  }
}

export function writeSensitiveSessionValue<T>(key: string, value: T): void {
  if (!isBrowser()) return
  const payload: StoredValue<T> = { savedAt: Date.now(), value }
  window.sessionStorage.setItem(key, JSON.stringify(payload))
}

export function removeSensitiveSessionValue(key: string): void {
  if (!isBrowser()) return
  window.sessionStorage.removeItem(key)
}

export function removeLegacySensitiveStorage(): void {
  if (!isBrowser()) return
  for (const key of LEGACY_KEYS) {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  }
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index)
    if (key && SENSITIVE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      window.localStorage.removeItem(key)
    }
  }
}

export function clearSensitiveBrowserStorage(): void {
  if (!isBrowser()) return
  removeLegacySensitiveStorage()
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index)
    if (key && SENSITIVE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      window.sessionStorage.removeItem(key)
    }
  }
}

