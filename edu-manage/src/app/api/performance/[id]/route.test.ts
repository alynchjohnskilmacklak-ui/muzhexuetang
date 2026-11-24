import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn(), resolveTeacherForUser: vi.fn() }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/performance', () => ({ resolveTeacherForUser: mocks.resolveTeacherForUser }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('GET /api/performance/[id] read state', () => {
  const findFirst = vi.fn()
  const postUpdateMany = vi.fn()
  const commentUpdateMany = vi.fn()
  const notificationUpdateMany = vi.fn()
  const post = {
    id: 'post-1',
    studentId: 'student-1',
    teacherId: 'teacher-1',
    deletedAt: null,
    visibility: 'PARENT_ONLY',
    isReadByParent: false,
    student: { id: 'student-1', parentId: 'parent-1', parentUserId: null },
    comments: [{ id: 'comment-1', isRead: false, author: { role: 'parent' } }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent' })
    mocks.resolveTeacherForUser.mockResolvedValue({ id: 'teacher-1' })
    findFirst.mockResolvedValue({ ...post, student: { ...post.student }, comments: [...post.comments] })
    postUpdateMany.mockResolvedValue({ count: 1 })
    commentUpdateMany.mockResolvedValue({ count: 1 })
    notificationUpdateMany.mockResolvedValue({ count: 1 })
    mocks.getRequestPrisma.mockResolvedValue({
      performancePost: { findFirst, updateMany: postUpdateMany },
      postComment: { updateMany: commentUpdateMany },
      $transaction: (callback: (tx: unknown) => unknown) => callback({
        performancePost: { updateMany: postUpdateMany },
        notification: { updateMany: notificationUpdateMany },
      }),
    })
  })

  it('marks a linked parent-visible post read only after scoped detail retrieval', async () => {
    const response = await GET(new NextRequest('http://localhost/api/performance/post-1'), {
      params: Promise.resolve({ id: 'post-1' }),
    })

    expect(response.status).toBe(200)
    expect(findFirst.mock.calls[0][0].where).toMatchObject({
      id: 'post-1',
      visibility: { in: ['PARENT_ONLY', 'CLASS_PUBLIC'] },
      student: { is: { OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }] } },
    })
    expect(postUpdateMany.mock.calls[0][0].where).toMatchObject({ id: 'post-1', student: { OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }] } })
    expect(notificationUpdateMany.mock.calls[0][0].where).toMatchObject({
      userId: 'parent-1',
      read: false,
      status: { in: ['ACTIVE', 'ARCHIVED'] },
      deletedAt: null,
      OR: [
        { relatedId: 'post-1', OR: expect.arrayContaining([{ relatedType: { in: ['PERFORMANCE_FEEDBACK', 'PERFORMANCE_UPDATE'] } }]) },
        { relatedId: null, type: { in: ['PERFORMANCE_FEEDBACK', 'PERFORMANCE_UPDATE'] }, href: { contains: 'feedbackId=post-1' } },
      ],
    })
    expect(notificationUpdateMany.mock.calls[0][0].data).toMatchObject({ read: true })
    expect((await response.json()).isReadByParent).toBe(true)
    expect(commentUpdateMany).not.toHaveBeenCalled()
  })

  it('marks parent comments read when the owning teacher opens the post detail', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user', email: 'teacher@example.test', name: '教师', role: 'teacher' })

    const response = await GET(new NextRequest('http://localhost/api/performance/post-1'), {
      params: Promise.resolve({ id: 'post-1' }),
    })

    expect(response.status).toBe(200)
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ id: 'post-1', teacherId: 'teacher-1' })
    expect(commentUpdateMany.mock.calls[0][0].where).toMatchObject({ postId: 'post-1', author: { role: 'parent' }, isRead: false })
    expect((await response.json()).comments[0].isRead).toBe(true)
  })

  it('does not mark a post read if it is not linked to the parent', async () => {
    findFirst.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/performance/foreign'), {
      params: Promise.resolve({ id: 'foreign' }),
    })

    expect(response.status).toBe(404)
    expect(postUpdateMany).not.toHaveBeenCalled()
    expect(notificationUpdateMany).not.toHaveBeenCalled()
    expect(commentUpdateMany).not.toHaveBeenCalled()
  })
})
