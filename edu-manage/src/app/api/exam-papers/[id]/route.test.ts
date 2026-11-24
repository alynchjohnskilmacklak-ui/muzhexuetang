import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn(), resolveTeacherForUser: vi.fn() }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/performance', () => ({ resolveTeacherForUser: mocks.resolveTeacherForUser }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET, PATCH } from './route'

describe('exam-paper detail parent visibility', () => {
  const findFirst = vi.fn()
  const findUnique = vi.fn()
  const updateMany = vi.fn()
  const paperCommentUpdateMany = vi.fn()
  const notificationUpdateMany = vi.fn()
  const paper = {
    id: 'paper-1',
    status: 'PUBLISHED',
    student: { id: 'student-1', name: '学生', grade: '初一' },
    questions: [],
    reactions: [],
    comments: [],
    isReadByParent: false,
    readAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent', division: 'JUNIOR' })
    mocks.resolveTeacherForUser.mockResolvedValue({ id: 'teacher-1' })
    findFirst.mockResolvedValue({ ...paper, student: { ...paper.student }, comments: [] })
    updateMany.mockResolvedValue({ count: 0 })
    paperCommentUpdateMany.mockResolvedValue({ count: 0 })
    notificationUpdateMany.mockResolvedValue({ count: 1 })
    mocks.getRequestPrisma.mockResolvedValue({
      examPaper: { findFirst, findUnique, updateMany },
      paperComment: { updateMany: paperCommentUpdateMany },
      $transaction: (callback: (tx: unknown) => unknown) => callback({
        examPaper: { updateMany },
        notification: { updateMany: notificationUpdateMany },
      }),
    })
  })

  it('queries only published papers linked through either parent binding', async () => {
    const response = await GET(new NextRequest('http://localhost/api/exam-papers/paper-1'), {
      params: Promise.resolve({ id: 'paper-1' }),
    })
    expect(response.status).toBe(200)
    const where = findFirst.mock.calls[0][0].where
    expect(where).toMatchObject({ id: 'paper-1', status: 'PUBLISHED' })
    expect(where.student.OR).toEqual([
      { parentId: 'parent-1' },
      { parentUserId: 'parent-1' },
    ])
    expect(updateMany.mock.calls[0][0].data).toMatchObject({ isReadByParent: true })
    expect(notificationUpdateMany.mock.calls[0][0].where).toMatchObject({
      userId: 'parent-1',
      read: false,
      OR: [{ relatedId: 'paper-1', OR: expect.arrayContaining([{ relatedType: { in: ['EXAM_PAPER', 'PAPER_PUBLISHED'] } }]) }],
    })
    expect((await response.json()).isReadByParent).toBe(true)
  })

  it('repairs unread exam notifications when the paper itself was already read', async () => {
    findFirst.mockResolvedValue({ ...paper, isReadByParent: true, readAt: new Date('2026-10-30T10:00:00Z') })

    const response = await GET(new NextRequest('http://localhost/api/exam-papers/paper-1'), {
      params: Promise.resolve({ id: 'paper-1' }),
    })

    expect(response.status).toBe(200)
    expect(notificationUpdateMany).toHaveBeenCalledTimes(1)
    expect((await response.json()).isReadByParent).toBe(true)
  })

  it('returns not found for drafts and papers belonging to another family', async () => {
    findFirst.mockResolvedValue(null)
    const response = await GET(new NextRequest('http://localhost/api/exam-papers/paper-foreign'), {
      params: Promise.resolve({ id: 'paper-foreign' }),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: '试卷不存在' })
  })

  it('limits teacher detail lookup to the resolved teacher profile', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user', email: 't@example.com', name: '教师', role: 'teacher', division: 'JUNIOR' })
    findFirst.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/exam-papers/paper-foreign'), {
      params: Promise.resolve({ id: 'paper-foreign' }),
    })

    expect(response.status).toBe(404)
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ id: 'paper-foreign', teacherId: 'teacher-1' })
  })

  it('marks parent comments as read when staff opens a paper detail', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user', email: 't@example.com', name: '教师', role: 'teacher', division: 'JUNIOR' })
    findFirst.mockResolvedValue({ ...paper, comments: [{ id: 'comment-1', isRead: false, author: { role: 'parent' } }] })
    paperCommentUpdateMany.mockResolvedValue({ count: 1 })

    const response = await GET(new NextRequest('http://localhost/api/exam-papers/paper-1'), {
      params: Promise.resolve({ id: 'paper-1' }),
    })

    expect(response.status).toBe(200)
    expect(paperCommentUpdateMany.mock.calls[0][0].where).toMatchObject({
      paperId: 'paper-1',
      author: { role: 'parent' },
      isRead: false,
    })
    expect((await response.json()).comments[0].isRead).toBe(true)
  })

  it('does not mark a parent-visible draft as read or expose its data', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent', division: 'JUNIOR' })
    updateMany.mockResolvedValue({ count: 0 })
    const request = new NextRequest('http://localhost/api/exam-papers/draft-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isReadByParent: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'draft-1' }) })

    expect(response.status).toBe(404)
    expect(updateMany.mock.calls[0][0].where).toMatchObject({ id: 'draft-1', status: 'PUBLISHED' })
    expect(updateMany.mock.calls[0][0].where.student.OR).toEqual([
      { parentId: 'parent-1' },
      { parentUserId: 'parent-1' },
    ])
    expect(findUnique).not.toHaveBeenCalled()
    expect(findFirst).not.toHaveBeenCalled()
  })

  it('allows a parent to mark only a published linked paper as read', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent', division: 'JUNIOR' })
    updateMany.mockResolvedValue({ count: 1 })
    findFirst.mockResolvedValue({ ...paper, isReadByParent: true })
    const request = new NextRequest('http://localhost/api/exam-papers/paper-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isReadByParent: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'paper-1' }) })

    expect(response.status).toBe(200)
    expect(updateMany.mock.calls[0][0].where).toMatchObject({ id: 'paper-1', status: 'PUBLISHED' })
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ id: 'paper-1', status: 'PUBLISHED' })
    expect(notificationUpdateMany).toHaveBeenCalledTimes(1)
  })
})
