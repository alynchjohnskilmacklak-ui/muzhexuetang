import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireCurrentTeacher: vi.fn() }))
vi.mock('@/lib/teacher-portal', () => ({ requireCurrentTeacher: mocks.requireCurrentTeacher }))

import { GET } from './route'

describe('GET /api/teacher/messages', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the current teacher messages and only notifications owned by the teacher account', async () => {
    const messages = [{ id: 'teacher-message-1', title: '考勤提醒', content: '请完成考勤', readAt: null }]
    const notifications = [{ id: 'notification-1', title: '家长留言待回复', content: '有新的留言', read: false }]
    const prisma = {
      teacherMessage: { findMany: vi.fn().mockResolvedValue(messages) },
      notification: { findMany: vi.fn().mockResolvedValue(notifications) },
    }
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'teacher-user-1' },
      teacher: { id: 'teacher-1' },
      prisma,
    })

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ messages, notifications })
    expect(prisma.teacherMessage.findMany).toHaveBeenCalledWith({
      where: { teacherId: 'teacher-1' },
      select: { id: true, type: true, title: true, content: true, readAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'teacher-user-1', status: 'ACTIVE', deletedAt: null },
      select: { id: true, title: true, content: true, type: true, href: true, link: true, read: true, readAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  })
})
