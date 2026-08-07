import type { PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import {
  mergeLoginRecordPage,
  parseLoginRecordDivision,
  recordDailySessionAccess,
  SESSION_ACCESS_REASON,
} from '@/lib/login-records'

function record(id: string, division: 'JUNIOR' | 'SENIOR', minute: number) {
  return { id, division, createdAt: new Date(`2026-07-20T10:${String(minute).padStart(2, '0')}:00.000Z`) }
}

describe('dual database login record pagination', () => {
  const junior = [record('j3', 'JUNIOR', 58), record('j2', 'JUNIOR', 54), record('j1', 'JUNIOR', 50)]
  const senior = [record('s3', 'SENIOR', 59), record('s2', 'SENIOR', 55), record('s1', 'SENIOR', 51)]

  it('merges both divisions in one global descending timeline', () => {
    expect(mergeLoginRecordPage(junior, senior, 0, 4).map((item) => item.id))
      .toEqual(['s3', 'j3', 's2', 'j2'])
  })

  it('applies later pages after the merge without duplicates', () => {
    const firstPage = mergeLoginRecordPage(junior, senior, 0, 3)
    const secondPage = mergeLoginRecordPage(junior, senior, 3, 3)
    expect(secondPage.map((item) => item.id)).toEqual(['j2', 's1', 'j1'])
    expect(new Set([...firstPage, ...secondPage].map((item) => `${item.division}:${item.id}`)).size).toBe(6)
  })

  it('accepts only supported division filters', () => {
    expect(parseLoginRecordDivision(null)).toBe('ALL')
    expect(parseLoginRecordDivision('junior')).toBe('JUNIOR')
    expect(parseLoginRecordDivision('SENIOR')).toBe('SENIOR')
    expect(parseLoginRecordDivision('unknown')).toBeNull()
  })
})

describe('daily authenticated access records', () => {
  function client(existing: { id: string } | null) {
    const loginRecordFindFirst = vi.fn().mockResolvedValue(existing)
    const loginRecordCreate = vi.fn().mockResolvedValue({ id: 'new-record' })
    const userUpdate = vi.fn().mockResolvedValue({ id: 'parent-1' })
    const transaction = vi.fn().mockResolvedValue([])
    return {
      prisma: {
        loginRecord: { findFirst: loginRecordFindFirst, create: loginRecordCreate },
        user: { update: userUpdate },
        $transaction: transaction,
      } as unknown as PrismaClient,
      loginRecordFindFirst,
      loginRecordCreate,
      userUpdate,
      transaction,
    }
  }

  const meta = {
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    device: '手机 · 微信内置浏览器',
    os: 'iPhone',
    browser: '微信内置浏览器',
  }

  it('creates one session-resume record when the account has no success today', async () => {
    const mocks = client(null)
    await expect(recordDailySessionAccess(
      mocks.prisma,
      { id: 'parent-1', email: 'parent@example.com' },
      meta,
      new Date('2026-07-23T08:00:00.000Z'),
    )).resolves.toBe(true)

    expect(mocks.loginRecordCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'parent-1',
        success: true,
        failReason: SESSION_ACCESS_REASON,
      }),
    })
    expect(mocks.userUpdate).toHaveBeenCalled()
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
  })

  it('does not duplicate a password login or earlier access from the same day', async () => {
    const mocks = client({ id: 'existing-success' })
    await expect(recordDailySessionAccess(
      mocks.prisma,
      { id: 'parent-1', email: 'parent@example.com' },
      meta,
      new Date('2026-07-23T08:00:00.000Z'),
    )).resolves.toBe(false)

    expect(mocks.loginRecordCreate).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
