import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ requireParentUser: vi.fn(), getParentStudentIds: vi.fn(), createManyNotifications: vi.fn() }))
vi.mock('@/lib/auth/guards', () => ({ requireParentUser: mocks.requireParentUser, getParentStudentIds: mocks.getParentStudentIds }))
vi.mock('@/lib/notifications', () => ({ createManyNotifications: mocks.createManyNotifications }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET, POST } from './route'

describe('parent homework access', () => {
  const assignmentFindMany = vi.fn()
  const studentFindMany = vi.fn()
  const prisma = { homeworkAssignment: { findMany: assignmentFindMany }, student: { findMany: studentFindMany } }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireParentUser.mockResolvedValue({ id: 'parent-1', prisma })
    mocks.getParentStudentIds.mockResolvedValue(['child-1'])
  })

  it('returns an empty roster without querying assignments when no child is linked', async () => {
    mocks.getParentStudentIds.mockResolvedValue([])
    const response = await GET()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ students: [], assignments: [] })
    expect(assignmentFindMany).not.toHaveBeenCalled()
  })

  it('rejects submission for a child outside the signed-in parent account', async () => {
    const response = await POST(new NextRequest('http://localhost/api/parent/homework', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId: 'assignment-1', studentId: 'other-child', content: '答案' }),
    }))
    expect(response.status).toBe(403)
    expect(assignmentFindMany).not.toHaveBeenCalled()
  })

  it('requires a written response or an uploaded photo', async () => {
    const response = await POST(new NextRequest('http://localhost/api/parent/homework', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId: 'assignment-1', studentId: 'child-1', content: '   ', attachmentUrls: [] }),
    }))
    expect(response.status).toBe(400)
  })
})
