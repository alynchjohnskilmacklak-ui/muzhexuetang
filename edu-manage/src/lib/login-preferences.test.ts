import { describe, expect, it } from 'vitest'
import {
  clearLoginPreference,
  parseLoginPreference,
  readLoginPreference,
  writeLoginPreference,
} from './login-preferences'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

describe('login preferences', () => {
  it('stores only normalized account context and restores it', () => {
    const storage = memoryStorage()
    writeLoginPreference({ email: ' Parent@Test.COM ', role: 'parent', division: 'JUNIOR' }, storage)

    expect(readLoginPreference(storage)).toEqual({
      email: 'parent@test.com',
      role: 'parent',
      division: 'JUNIOR',
    })
    expect(storage.getItem('muzhe_login_preference_v1')).not.toContain('password')
  })

  it('rejects invalid or tampered preferences', () => {
    expect(parseLoginPreference('{"email":"parent@test.com","role":"root","division":"JUNIOR"}')).toBeNull()
    expect(parseLoginPreference('{"email":"invalid","role":"parent","division":"JUNIOR"}')).toBeNull()
    expect(parseLoginPreference('not-json')).toBeNull()
  })

  it('can forget the remembered account without touching other storage', () => {
    const storage = memoryStorage()
    storage.setItem('unrelated', 'keep')
    writeLoginPreference({ email: 'teacher@test.com', role: 'teacher', division: 'SENIOR' }, storage)
    clearLoginPreference(storage)

    expect(readLoginPreference(storage)).toBeNull()
    expect(storage.getItem('unrelated')).toBe('keep')
  })
})
