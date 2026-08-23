import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { resolvePublicOrigin } from './public-origin'

describe('resolvePublicOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefers the configured public HTTPS address behind a reverse proxy', () => {
    vi.stubEnv('NEXTAUTH_URL', 'https://muzhexuetang.xyz')
    const request = new NextRequest('http://localhost:3000/api/admin/parent-activation')

    expect(resolvePublicOrigin(request)).toBe('https://muzhexuetang.xyz')
  })

  it('uses a non-local forwarded host when public URL configuration is absent', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXTAUTH_URL', '')
    vi.stubEnv('AUTH_URL', '')
    const request = new NextRequest('http://localhost:3000/api/admin/parent-activation', {
      headers: {
        'x-forwarded-host': 'www.muzhexuetang.xyz',
        'x-forwarded-proto': 'https',
      },
    })

    expect(resolvePublicOrigin(request)).toBe('https://www.muzhexuetang.xyz')
  })

  it('never exposes a configured localhost address in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXTAUTH_URL', 'https://localhost:3000')
    vi.stubEnv('AUTH_URL', '')
    const request = new NextRequest('http://localhost:3000/api/admin/parent-activation')

    expect(resolvePublicOrigin(request)).toBe('https://muzhexuetang.xyz')
  })

  it('does not reflect a forged forwarded host in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PUBLIC_APP_URL', '')
    vi.stubEnv('NEXTAUTH_URL', '')
    vi.stubEnv('AUTH_URL', '')
    const request = new NextRequest('http://localhost:3000/api/admin/parent-activation', {
      headers: { 'x-forwarded-host': 'evil.example', host: 'evil.example' },
    })

    expect(resolvePublicOrigin(request)).toBe('https://muzhexuetang.xyz')
  })
})
