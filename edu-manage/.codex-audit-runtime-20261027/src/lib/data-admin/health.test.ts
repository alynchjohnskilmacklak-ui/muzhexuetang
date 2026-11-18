import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: vi.fn() }))
import { runDataHealthCheck } from './health'

describe('data health totals and division boundaries', () => {
  it('reports actual totals instead of the 50-row sample size', async () => {
    const raw = vi.fn(async (query: { sql: string }) => {
      if (query.sql.includes('FROM "Attendance"')) return [{ studentId: 's1', lessonId: 'l1', cnt: 2, totalCount: BigInt(83) }]
      return []
    })
    const db = { $queryRaw: raw, student: { findMany: vi.fn().mockResolvedValue([{ id: 's2' }]), count: vi.fn().mockResolvedValue(120) } } as unknown as PrismaClient
    const issues = await runDataHealthCheck(db, 'SENIOR')
    expect(issues.find(issue => issue.label === '重复考勤')).toMatchObject({ count: 83, sampleIds: ['s1/l1'] })
    expect(issues.find(issue => issue.label === '课时异常（负数）')).toMatchObject({ count: 120 })
    for (const [query] of raw.mock.calls) expect(query.sql).toContain('"division"')
    expect(db.student.count).toHaveBeenCalledWith({ where: { remainHours: { lt: 0 }, deletedAt: null, division: 'SENIOR' } })
    expect(raw.mock.calls.some(([q]) => q.sql.includes('r."actorUserId"'))).toBe(true)
    expect(raw.mock.calls.some(([q]) => q.sql.includes('cg."id"'))).toBe(true)
  })
})
