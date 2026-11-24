import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  createNotification: vi.fn(),
  qywxEnabled: vi.fn(),
}))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/notifications', () => ({ createNotification: mocks.createNotification }))
vi.mock('@/lib/qywx', () => ({ qywxEnabled: mocks.qywxEnabled }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

describe('POST /api/grade-records/[id]/push-to-parent', () => {
  const findFirst = vi.fn()
  const updateMany = vi.fn()
  const activityCreate = vi.fn()
  const transaction = vi.fn()
  const prisma = { gradeRecord: { findFirst }, $transaction: transaction }
  const tx = { gradeRecord: { updateMany }, activityLog: { create: activityCreate }, notification: { create: vi.fn(), createMany: vi.fn() } }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    mocks.createNotification.mockResolvedValue({ id: 'notification-1' })
    mocks.qywxEnabled.mockReturnValue(false)
    findFirst.mockResolvedValue({
      id: 'grade-1', score: 92, notifySent: false,
      student: { id: 'student-1', name: '小明', parentId: 'parent-1', parentUserId: 'parent-1' },
      assessment: { name: '阶段测评', fullScore: 100, group: { division: 'JUNIOR' } },
    })
    updateMany.mockResolvedValue({ count: 1 })
    transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
  })

  it('notifies the bound parent and atomically marks the result as sent', async () => {
    const response = await POST(new NextRequest('http://localhost/api/grade-records/grade-1/push-to-parent', { method: 'POST' }), {
      params: Promise.resolve({ id: 'grade-1' }),
    })

    expect(response.status).toBe(200)
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'grade-1', deletedAt: null, notifySent: false }, data: { notifySent: true } })
    expect(mocks.createNotification).toHaveBeenCalledWith(tx, expect.objectContaining({
      userId: 'parent-1', type: 'GRADE_RECORD', content: '阶段测评：92 / 100 分。',
    }))
  })

  it('does not expose the push action to teacher accounts', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-1', role: 'teacher', division: 'JUNIOR' })
    const response = await POST(new NextRequest('http://localhost/api/grade-records/grade-1/push-to-parent', { method: 'POST' }), {
      params: Promise.resolve({ id: 'grade-1' }),
    })

    expect(response.status).toBe(403)
    expect(findFirst).not.toHaveBeenCalled()
  })
})
