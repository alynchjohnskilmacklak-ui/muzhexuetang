import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ requireAdminUser: vi.fn(), getFeedbackArchive: vi.fn() }))

vi.mock('@/lib/auth/guards', () => ({
  requireAdminUser: mocks.requireAdminUser,
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/classroom-feedback/archive', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/classroom-feedback/archive')>()
  return { ...actual, getFeedbackArchive: mocks.getFeedbackArchive }
})
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('admin student feedback archive route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminUser.mockResolvedValue({ id: 'admin-a', role: 'admin', division: 'JUNIOR', prisma: {} })
    mocks.getFeedbackArchive.mockResolvedValue({
      student: { id: 'student-a', name: '学生甲', grade: '初二' },
      summary: { totalCount: 0, subjectCount: 0, teacherCount: 0, firstFeedbackDate: null, latestFeedbackDate: null },
      pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
      items: [],
    })
  })

  it('includes linked term records in the admin archive by default', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/admin/students/student-a/feedback-archive'),
      { params: Promise.resolve({ id: 'student-a' }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.getFeedbackArchive).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({
      studentId: 'student-a',
      includeLinkedRecords: true,
    }))
  })

  it('can explicitly request only the selected term record', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/admin/students/student-a/feedback-archive?includeLinkedRecords=0'),
      { params: Promise.resolve({ id: 'student-a' }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.getFeedbackArchive).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({
      studentId: 'student-a',
      includeLinkedRecords: false,
    }))
  })
})
