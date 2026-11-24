import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  parentVisibleExamPaperWhere: vi.fn(),
  resolveTeacherForUser: vi.fn(),
  findFirst: vi.fn(),
  reactionFindUnique: vi.fn(),
  reactionCreate: vi.fn(),
  reactionDelete: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/business-visibility', () => ({ parentVisibleExamPaperWhere: mocks.parentVisibleExamPaperWhere }))
vi.mock('@/lib/performance', () => ({ resolveTeacherForUser: mocks.resolveTeacherForUser }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

const request = (body: unknown = {}) => new NextRequest('http://localhost/api/exam-papers/paper-1/react', {
  method: 'POST',
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json' },
})

describe('POST /api/exam-papers/[id]/react', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', email: 'parent@example.com', name: '家长', role: 'parent' })
    mocks.parentVisibleExamPaperWhere.mockReturnValue({ student: { parentId: 'parent-1' } })
    mocks.resolveTeacherForUser.mockResolvedValue({ id: 'teacher-own' })
    mocks.findFirst.mockResolvedValue({ id: 'paper-1' })
    mocks.reactionFindUnique.mockResolvedValue(null)
    mocks.reactionCreate.mockResolvedValue({})
    mocks.reactionDelete.mockResolvedValue({})
    mocks.getRequestPrisma.mockResolvedValue({
      examPaper: { findFirst: mocks.findFirst },
      paperReaction: {
        findUnique: mocks.reactionFindUnique,
        create: mocks.reactionCreate,
        delete: mocks.reactionDelete,
      },
    })
  })

  it('does not let a parent react to a paper outside their visible student scope', async () => {
    mocks.findFirst.mockResolvedValue(null)

    const response = await POST(request(), { params: Promise.resolve({ id: 'private-paper' }) })

    expect(response.status).toBe(404)
    expect(mocks.parentVisibleExamPaperWhere).toHaveBeenCalledWith('parent-1')
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: 'private-paper', student: { parentId: 'parent-1' } },
      select: { id: true },
    })
    expect(mocks.reactionFindUnique).not.toHaveBeenCalled()
    expect(mocks.reactionCreate).not.toHaveBeenCalled()
  })

  it('accepts only the supported HEART reaction type', async () => {
    const response = await POST(request({ type: 'CUSTOM' }), { params: Promise.resolve({ id: 'paper-1' }) })

    expect(response.status).toBe(400)
    expect(mocks.findFirst).not.toHaveBeenCalled()
    expect(mocks.reactionCreate).not.toHaveBeenCalled()
  })

  it('uses the teacher own-paper scope before allowing a reaction', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user', email: 'teacher@example.com', name: '老师', role: 'teacher' })
    mocks.findFirst.mockResolvedValue(null)

    const response = await POST(request(), { params: Promise.resolve({ id: 'other-teacher-paper' }) })

    expect(response.status).toBe(404)
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: 'other-teacher-paper', teacherId: 'teacher-own', status: { not: 'DELETED' }, deletedAt: null },
      select: { id: true },
    })
    expect(mocks.reactionCreate).not.toHaveBeenCalled()
  })

  it('creates the default HEART reaction only after visibility is confirmed', async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: 'paper-1' }) })

    expect(response.status).toBe(200)
    expect(mocks.reactionCreate).toHaveBeenCalledWith({
      data: { paperId: 'paper-1', userId: 'parent-1', type: 'HEART' },
    })
  })
})
