import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PARENT_ACTIVE_CHILD_COOKIE } from '@/constants/membership'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn(), getParentChildren: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/parent-children', () => ({ getParentChildren: mocks.getParentChildren }))
import { GET } from './route'

describe('parent children API selection contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'parent' } })
    mocks.getRequestPrisma.mockResolvedValue({})
    mocks.getParentChildren.mockResolvedValue([
      { id: 'a', recordIds: ['a', 'a-old'], name: '甲', grade: '初一' },
      { id: 'b', recordIds: ['b'], name: '乙', grade: '初三' },
    ])
  })

  it('reports invalid requested identity separately from valid cookie fallback', async () => {
    const response = await GET(new NextRequest('http://localhost/api/parent/children?childId=foreign', {
      headers: { cookie: `${PARENT_ACTIVE_CHILD_COOKIE}=b` },
    }))
    expect(await response.json()).toMatchObject({ activeChildId: 'b', invalidChild: true })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('maps historical aliases and gives the URL precedence over cookies', async () => {
    const response = await GET(new NextRequest('http://localhost/api/parent/children?childId=a-old', {
      headers: { cookie: `${PARENT_ACTIVE_CHILD_COOKIE}=b` },
    }))
    expect(await response.json()).toMatchObject({ activeChildId: 'a', invalidChild: false })
  })

  it('requires authentication', async () => {
    mocks.auth.mockResolvedValue(null)
    expect((await GET(new NextRequest('http://localhost/api/parent/children'))).status).toBe(401)
    expect(mocks.getParentChildren).not.toHaveBeenCalled()
  })
})
