import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ guard: vi.fn(), cleanup: vi.fn(), db: vi.fn(), user: vi.fn(), count: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.db }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/danger-guard', () => ({ assertDangerAuth: mocks.guard }))
vi.mock('@/lib/data-correction/trash', () => ({ cleanupExpiredTrash: mocks.cleanup }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (fn: unknown) => fn }))
import { GET, POST } from './route'

describe('cleanup only expired recycle-bin records', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.guard.mockResolvedValue({ userId: 'admin1' })
    mocks.user.mockResolvedValue({ id: 'admin1', role: 'admin', email: 'admin@example.com' })
    mocks.db.mockResolvedValue({ deletedRecord: { count: mocks.count } })
    mocks.count.mockResolvedValue(4)
    mocks.cleanup.mockResolvedValue({ purged: 2, errors: [] })
  })
  it('does not classify ordinary archives or cancellations as trash', async () => {
    expect(await (await GET()).json()).toMatchObject({ archivedGroups: 0, cancelledLessons: 0, inactiveStudents: 0, expiredTrash: 4, totalSoftDeleted: 4 })
    expect(mocks.count).toHaveBeenCalledWith({ where: { expiresAt: { lte: expect.any(Date) } } })
  })
  it('delegates to the retention-aware cleanup service only after danger authorization', async () => {
    const response = await POST(new NextRequest('http://localhost/api/admin/cleanup', { method: 'POST', body: JSON.stringify({ confirmPhrase: 'test' }) }))
    expect(await response.json()).toMatchObject({ success: true, results: { trashRecords: 2 } })
    expect(mocks.guard).toHaveBeenCalledWith({ confirmPhrase: 'test' }, '永久删除所有废弃数据')
    expect(mocks.cleanup).toHaveBeenCalledWith(await mocks.db(), 'admin1')
  })
  it('reports cleanup failures instead of claiming all succeeded', async () => {
    mocks.cleanup.mockResolvedValue({ purged: 1, errors: ['busy record'] })
    const response = await POST(new NextRequest('http://localhost/api/admin/cleanup', { method: 'POST', body: '{}' }))
    expect(await response.json()).toMatchObject({ success: false, partial: true, errors: ['busy record'] })
  })
})
