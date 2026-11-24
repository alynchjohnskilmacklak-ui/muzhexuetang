import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ requireCurrentTeacher: vi.fn(), createManyNotifications: vi.fn() }))
vi.mock('@/lib/teacher-portal', () => ({ requireCurrentTeacher: mocks.requireCurrentTeacher }))
vi.mock('@/lib/notifications', () => ({ createManyNotifications: mocks.createManyNotifications }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

describe('teacher homework review authorization', () => {
  const submissionFindFirst = vi.fn()
  const submissionUpdate = vi.fn()
  const prisma = { homeworkSubmission: { findFirst: submissionFindFirst, update: submissionUpdate } }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireCurrentTeacher.mockResolvedValue({ user: { id: 'teacher-user' }, teacher: { id: 'teacher-1' }, prisma })
  })

  it('does not allow a teacher to review another teacher’s assignment', async () => {
    submissionFindFirst.mockResolvedValue(null)
    const response = await POST(new NextRequest('http://localhost/api/teacher/homework/submission-1/review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teacherComment: '已完成' }),
    }), { params: Promise.resolve({ id: 'submission-1' }) })
    expect(response.status).toBe(404)
    expect(submissionUpdate).not.toHaveBeenCalled()
    expect(mocks.createManyNotifications).not.toHaveBeenCalled()
  })

  it('requires a score or feedback before saving review', async () => {
    const response = await POST(new NextRequest('http://localhost/api/teacher/homework/submission-1/review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score: null, teacherComment: ' ' }),
    }), { params: Promise.resolve({ id: 'submission-1' }) })
    expect(response.status).toBe(400)
    expect(submissionFindFirst).not.toHaveBeenCalled()
  })
})
