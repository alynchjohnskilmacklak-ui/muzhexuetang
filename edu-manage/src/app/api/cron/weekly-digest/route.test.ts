import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }))
vi.mock('@/lib/auth/guards', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
}))
vi.mock('@/lib/prisma', () => ({
  getPrismaForDivision: vi.fn(),
  isDualDbEnabled: vi.fn(() => false),
  prisma: {},
}))

import { prisma } from '@/lib/prisma'
import { GET } from './route'

afterEach(() => vi.unstubAllEnvs())

describe('weekly digest cron authentication', () => {
  it('still rejects requests without the route secret after proxy forwarding', async () => {
    vi.stubEnv('CRON_SECRET', 'expected-secret')
    const request = new NextRequest('https://example.test/api/cron/weekly-digest')

    const response = await GET(request)

    expect(response.status).toBe(401)
  })
})

function makeConcurrentDigestDb() {
  const digestRows: Array<{
    userId: string
    relatedType: string | null
    relatedId: string | null
    deletedAt: Date | null
  }> = []
  const lockKeys: string[] = []
  const isolationLevels: string[] = []
  const lockTails = new Map<string, Promise<void>>()
  const acquireLock = async (key: string) => {
    const previous = lockTails.get(key) ?? Promise.resolve()
    let releaseLock!: () => void
    const tail = new Promise<void>((resolve) => { releaseLock = resolve })
    lockTails.set(key, tail)
    await previous
    return () => {
      releaseLock()
      if (lockTails.get(key) === tail) lockTails.delete(key)
    }
  }

  const notification = {
    findMany: vi.fn().mockResolvedValue([{ userId: 'parent-1' }]),
    findFirst: vi.fn(async ({ where }: { where: { userId: string; relatedType: string; relatedId: string } }) => (
      digestRows.find((row) => (
        row.userId === where.userId &&
        row.relatedType === where.relatedType &&
        row.relatedId === where.relatedId &&
        row.deletedAt === null
      )) ?? null
    )),
    groupBy: vi.fn().mockResolvedValue([
      { relatedType: 'CLASSROOM_FEEDBACK', _count: { _all: 1 } },
    ]),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row = {
        userId: String(data.userId),
        relatedType: typeof data.relatedType === 'string' ? data.relatedType : null,
        relatedId: typeof data.relatedId === 'string' ? data.relatedId : null,
        deletedAt: null,
      }
      digestRows.push(row)
      return { id: `digest-${digestRows.length}` }
    }),
  }

  const db = {
    notification,
    $transaction: vi.fn(async (
      callback: (tx: unknown) => Promise<unknown>,
      options?: { isolationLevel?: string },
    ) => {
      if (options?.isolationLevel) isolationLevels.push(options.isolationLevel)
      const releases: Array<() => void> = []
      const tx = {
        notification,
        $queryRaw: async (query: TemplateStringsArray, ...values: unknown[]) => {
          expect(query.join('')).toContain('pg_advisory_xact_lock')
          const key = `${String(values[0])}:${String(values[1])}`
          lockKeys.push(key)
          releases.push(await acquireLock(key))
          return []
        },
      }
      try {
        return await callback(tx)
      } finally {
        for (const release of releases.reverse()) release()
      }
    }),
  }

  return { db, digestRows, lockKeys, isolationLevels, notification }
}

describe('weekly digest concurrency idempotency', () => {
  it('creates only one digest when route invocations race, and skips it on retry', async () => {
    vi.stubEnv('CRON_SECRET', 'expected-secret')
    const { db, digestRows, lockKeys, isolationLevels, notification } = makeConcurrentDigestDb()
    Object.assign(prisma, db)
    const request = () => new NextRequest('https://example.test/api/cron/weekly-digest?token=expected-secret')

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => GET(request())),
    )
    const payloads = await Promise.all(responses.map((response) => response.json())) as Array<{
      results: { DEFAULT: { created: number } }
    }>

    expect(responses.every((response) => response.status === 200)).toBe(true)
    expect(digestRows).toHaveLength(1)
    expect(digestRows[0]).toEqual(expect.objectContaining({
      userId: 'parent-1',
      relatedType: 'WEEKLY_DIGEST',
      relatedId: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }))
    expect(payloads.reduce((sum, payload) => sum + payload.results.DEFAULT.created, 0)).toBe(1)
    expect(lockKeys).toHaveLength(5)
    expect(new Set(lockKeys).size).toBe(1)
    expect(new Set(isolationLevels)).toEqual(new Set(['ReadCommitted']))
    expect(notification.create).toHaveBeenCalledTimes(1)
    expect(notification.groupBy).toHaveBeenCalledTimes(1)

    const retryResponse = await GET(request())
    const retry = await retryResponse.json() as { results: { DEFAULT: { created: number } } }
    expect(retryResponse.status).toBe(200)
    expect(retry.results.DEFAULT.created).toBe(0)
    expect(notification.create).toHaveBeenCalledTimes(1)
  })
})
