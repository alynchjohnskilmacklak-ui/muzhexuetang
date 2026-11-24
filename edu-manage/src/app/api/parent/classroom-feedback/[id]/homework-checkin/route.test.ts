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
vi.mock('@/lib/business-visibility', () => ({ parentLinkedStudentWhere: (parentId: string) => ({ parentId }) }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET, POST } from './route'

describe('/api/parent/classroom-feedback/[id]/homework-checkin', () => {
  const studentFindFirst = vi.fn()
  const feedbackFindFirst = vi.fn()
  const checkinFindUnique = vi.fn()
  const checkinUpsert = vi.fn()
  const teacherUserFindFirst = vi.fn()
  const transaction = vi.fn()
  const prisma = {
    student: { findFirst: studentFindFirst },
    classroomFeedback: { findFirst: feedbackFindFirst },
    classroomFeedbackHomeworkCheckin: { findUnique: checkinFindUnique },
    $transaction: transaction,
  }
  const tx = {
    classroomFeedbackHomeworkCheckin: { findUnique: checkinFindUnique, upsert: checkinUpsert },
    user: { findFirst: teacherUserFindFirst },
    notification: { create: vi.fn(), createMany: vi.fn() },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    mocks.createNotification.mockResolvedValue({ id: 'notice-1' })
    mocks.qywxEnabled.mockReturnValue(false)
    studentFindFirst.mockResolvedValue({ id: 'student-1', name: '小明' })
    feedbackFindFirst.mockResolvedValue({ id: 'feedback-1', teacherId: 'teacher-1', teacher: { name: '李老师' } })
    checkinFindUnique.mockResolvedValue(null)
    checkinUpsert.mockResolvedValue({ status: 'NEED_HELP', note: '这道题不知道怎么列方程', submittedAt: new Date('2026-11-05T02:00:00Z') })
    teacherUserFindFirst.mockResolvedValue({ id: 'teacher-user-1' })
    transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
  })

  it('rejects non-parent users before reading homework progress', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user-1', role: 'teacher' })
    const response = await GET(new NextRequest('http://localhost/api/parent/classroom-feedback/feedback-1/homework-checkin?studentId=student-1'), {
      params: Promise.resolve({ id: 'feedback-1' }),
    })

    expect(response.status).toBe(403)
    expect(studentFindFirst).not.toHaveBeenCalled()
  })

  it('requires a short explanation when a parent asks for help', async () => {
    const response = await POST(new NextRequest('http://localhost/api/parent/classroom-feedback/feedback-1/homework-checkin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'student-1', status: 'NEED_HELP', note: ' ' }),
    }), { params: Promise.resolve({ id: 'feedback-1' }) })

    expect(response.status).toBe(400)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('saves a help request and notifies only the linked teacher account', async () => {
    const response = await POST(new NextRequest('http://localhost/api/parent/classroom-feedback/feedback-1/homework-checkin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'student-1', status: 'NEED_HELP', note: '这道题不知道怎么列方程' }),
    }), { params: Promise.resolve({ id: 'feedback-1' }) })

    expect(response.status).toBe(200)
    expect(checkinUpsert).toHaveBeenCalled()
    expect(mocks.createNotification).toHaveBeenCalledWith(tx, expect.objectContaining({
      userId: 'teacher-user-1', type: 'HOMEWORK_HELP_REQUEST', relatedId: 'feedback-1',
    }))
  })

  it('rejects a student that is not linked to the requesting parent', async () => {
    studentFindFirst.mockResolvedValue(null)
    const response = await POST(new NextRequest('http://localhost/api/parent/classroom-feedback/feedback-1/homework-checkin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'student-2', status: 'DONE' }),
    }), { params: Promise.resolve({ id: 'feedback-1' }) })

    expect(response.status).toBe(403)
    expect(checkinUpsert).not.toHaveBeenCalled()
  })
})
