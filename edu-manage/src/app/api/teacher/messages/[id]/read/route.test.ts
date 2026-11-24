import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ requireCurrentTeacher: vi.fn() }))
vi.mock('@/lib/teacher-portal', () => ({ requireCurrentTeacher: mocks.requireCurrentTeacher }))

import { POST } from './route'

describe('POST /api/teacher/messages/[id]/read', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marks only the current teacher-owned notification as read when explicitly selected', async () => {
    const prisma = {
      teacherMessage: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      notification: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    }
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'teacher-user-1' },
      teacher: { id: 'teacher-1' },
      prisma,
    })

    const response = await POST(new NextRequest('http://localhost/api/teacher/messages/notice-1/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'notification' }),
    }), { params: Promise.resolve({ id: 'notice-1' }) })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'notice-1', userId: 'teacher-user-1', status: 'ACTIVE', deletedAt: null, read: false },
      data: expect.objectContaining({ read: true, readAt: expect.any(Date) }),
    })
    expect(prisma.teacherMessage.updateMany).not.toHaveBeenCalled()
  })

  it('keeps the existing teacher-message read path scoped to the signed-in teacher', async () => {
    const prisma = {
      teacherMessage: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      notification: { updateMany: vi.fn() },
    }
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'teacher-user-1' },
      teacher: { id: 'teacher-1' },
      prisma,
    })

    const response = await POST(new NextRequest('http://localhost/api/teacher/messages/admin-note/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'teacher-message' }),
    }), { params: Promise.resolve({ id: 'admin-note' }) })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(prisma.teacherMessage.updateMany).toHaveBeenCalledWith({
      where: { id: 'admin-note', teacherId: 'teacher-1', readAt: null },
      data: expect.objectContaining({ readAt: expect.any(Date) }),
    })
    expect(prisma.notification.updateMany).not.toHaveBeenCalled()
  })
})
