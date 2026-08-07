import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindUnique: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({
  getPrismaForDivision: () => ({ user: { findUnique: mocks.userFindUnique } }),
}))

import { proxy } from '@/proxy'

describe('login session restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['admin', '/dashboard'],
    ['teacher', '/teacher/dashboard'],
    ['parent', '/parent/dashboard'],
  ])('redirects a valid %s session away from /login', async (role, destination) => {
    const id = `user-${role}`
    mocks.auth.mockResolvedValue({
      user: { id, role, division: 'JUNIOR', sessionMark: `mark-${role}` },
    })
    mocks.userFindUnique.mockResolvedValue({
      currentSessionToken: `mark-${role}`,
      status: 'active',
    })

    const response = await proxy(new NextRequest('https://muzhexuetang.xyz/login'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`https://muzhexuetang.xyz${destination}`)
  })

  it('shows the login page when no session cookie is present', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await proxy(new NextRequest('https://muzhexuetang.xyz/login'))

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(mocks.userFindUnique).not.toHaveBeenCalled()
  })

  it('allows a signed-out user to open the password reset page', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await proxy(new NextRequest('https://muzhexuetang.xyz/reset-password?token=test-token'))

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(mocks.userFindUnique).not.toHaveBeenCalled()
  })

  it('does not redirect a kicked session back into a login loop', async () => {
    mocks.auth.mockResolvedValue({
      user: { id: 'kicked-user', role: 'parent', division: 'JUNIOR', sessionMark: 'old-mark' },
    })
    mocks.userFindUnique.mockResolvedValue({ currentSessionToken: 'new-mark', status: 'active' })

    const response = await proxy(new NextRequest('https://muzhexuetang.xyz/login?reason=kicked'))

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })
})

describe('login client request contract', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'src/app/login/page.tsx'), 'utf8')
  const preflightSource = readFileSync(path.resolve(process.cwd(), 'src/app/api/auth/login-check/route.ts'), 'utf8')

  it('keeps login-check out of the password authentication critical path', () => {
    expect(source).not.toContain("fetch('/api/auth/login-check'")
    expect(preflightSource).not.toContain('bcrypt')
    expect(preflightSource).not.toContain('validateLoginAccount')
    expect(preflightSource).toContain('precheckLoginAccount')
  })

  it('does not perform duplicate session or device requests after sign-in', () => {
    expect(source).not.toContain("fetch('/api/auth/session')")
    expect(source).not.toContain("fetch('/api/auth/log-device'")
    expect(source).not.toContain('router.refresh()')
    expect(source).toContain('window.location.replace(destination)')
  })

  it('shows the retained SplashScreen once per tab without replaying it on submit', () => {
    expect(source).toContain('const [showSplash, setShowSplash] = useState(false)')
    expect(source).toContain("window.sessionStorage.getItem('splash-shown')")
    expect(source).toContain("window.sessionStorage.setItem('splash-shown', '1')")
    expect(source).not.toContain('startSplash()')
    expect(source).not.toContain('waitForSplash()')
    expect(source).toContain('<SplashScreen')
  })
})
