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

  it('checks hour balances at calculation precision and reports stale student snapshots', async () => {
    const raw = vi.fn(async (query: { sql: string }) => {
      if (query.sql.includes('"expectedHours"')) {
        return [{ id: 'attendance-a', cnt: 1, totalCount: BigInt(1) }]
      }
      if (query.sql.includes('FROM "LeaveRequest" lr')) {
        return [{ id: 'leave-a', cnt: 1, totalCount: BigInt(1) }]
      }
      if (query.sql.includes('SUM(e."remainHours")')) {
        return [
          { id: 'student-a', cnt: 1, totalCount: BigInt(2) },
          { id: 'student-b', cnt: 1, totalCount: BigInt(2) },
        ]
      }
      return []
    })
    const db = { $queryRaw: raw, student: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } } as unknown as PrismaClient

    const issues = await runDataHealthCheck(db)

    expect(issues.find(issue => issue.label === '学员课时快照与活跃报名不一致')).toMatchObject({
      count: 2,
      sampleIds: ['student-a', 'student-b'],
    })
    expect(issues.find(issue => issue.label === '考勤课时与批次规则不一致')).toMatchObject({
      count: 1,
      sampleIds: ['attendance-a'],
    })
    expect(issues.find(issue => issue.label === '已批准请假仍记为到课')).toMatchObject({
      count: 1,
      sampleIds: ['leave-a'],
    })
    expect(raw.mock.calls.some(([query]) => query.sql.includes('ROUND(e."remainHours"::numeric, 8)'))).toBe(true)
    expect(raw.mock.calls.some(([query]) => query.sql.includes('ROUND(s."remainHours"::numeric, 8)'))).toBe(true)
    expect(raw.mock.calls.some(([query]) => query.sql.includes('lr."leaveDate" + INTERVAL \'8 hours\''))).toBe(true)
  })
})
