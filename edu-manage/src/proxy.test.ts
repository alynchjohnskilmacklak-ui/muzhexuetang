import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrismaForDivision: vi.fn() }))

import { auth } from '@/lib/auth'
import { proxy } from './proxy'

describe('proxy cron routing', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue(null as never)
  })

  it('lets a cron request reach its handler without a user session', async () => {
    const response = await proxy(new NextRequest('https://example.test/api/cron/weekly-digest?token=cron-secret'))

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('does not treat a similarly prefixed path as a cron endpoint', async () => {
    const response = await proxy(new NextRequest('https://example.test/api/cronfoo'))

    expect(response.status).toBe(401)
  })
})
