import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  resolveTeacherForUser: vi.fn(),
  resolveLearningRecordTermId: vi.fn(),
  assertCanAccessStudent: vi.fn(),
  assertCanAccessClassLesson: vi.fn(),
}))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/performance', () => ({ resolveTeacherForUser: mocks.resolveTeacherForUser }))
vi.mock('@/lib/auth/guards', () => ({
  assertCanAccessStudent: mocks.assertCanAccessStudent,
  assertCanAccessClassLesson: mocks.assertCanAccessClassLesson,
}))
vi.mock('@/lib/division', () => ({ getRequestDivision: () => 'JUNIOR' }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: vi.fn() }))
vi.mock('@/lib/academic-term', () => ({ getActiveAcademicTerm: vi.fn().mockResolvedValue(null) }))
vi.mock('@/lib/learning-record-term', () => ({ resolveLearningRecordTermId: mocks.resolveLearningRecordTermId }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET, POST } from './route'

describe('exam-paper list parent visibility', () => {
  const findMany = vi.fn()
  const create = vi.fn()
  const activityLogCreate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent', division: 'JUNIOR' })
    mocks.getRequestPrisma.mockResolvedValue({ examPaper: { findMany, create }, activityLog: { create: activityLogCreate } })
    mocks.resolveTeacherForUser.mockResolvedValue({ id: 'teacher-1' })
    mocks.resolveLearningRecordTermId.mockResolvedValue('term-1')
    mocks.assertCanAccessStudent.mockResolvedValue(undefined)
    mocks.assertCanAccessClassLesson.mockResolvedValue(undefined)
    findMany.mockResolvedValue([])
    create.mockResolvedValue({ id: 'paper-1' })
  })

  it.each([
    ['/api/exam-papers', undefined],
    ['/api/exam-papers?mine=false', undefined],
    ['/api/exam-papers?mine=false&status=DRAFT&studentId=foreign-student', 'foreign-student'],
  ])('keeps the parent scope when querying %s', async (url, requestedStudentId) => {
    const response = await GET(new NextRequest(`http://localhost${url}`))
    expect(response.status).toBe(200)

    const where = findMany.mock.calls[0][0].where
    expect(where.status).toBe('PUBLISHED')
    expect(where.student.OR).toEqual([
      { parentId: 'parent-1' },
      { parentUserId: 'parent-1' },
    ])
    expect(where.studentId).toBe(requestedStudentId)
    expect(where.status).not.toBe('DRAFT')
  })

  it('does not query papers for unauthenticated requests', async () => {
    mocks.getCurrentUser.mockResolvedValue(null)
    const response = await GET(new NextRequest('http://localhost/api/exam-papers'))
    expect(response.status).toBe(401)
    expect(findMany).not.toHaveBeenCalled()
  })

  it('limits teacher lists to the resolved teacher even when a teacherId filter is supplied', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user', email: 't@example.com', name: '教师', role: 'teacher', division: 'JUNIOR' })

    const response = await GET(new NextRequest('http://localhost/api/exam-papers?teacherId=teacher-1'))

    expect(response.status).toBe(200)
    expect(findMany.mock.calls[0][0].where.teacherId).toBe('teacher-1')
  })

  it('rejects a teacher filter naming another teacher without querying papers', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user', email: 't@example.com', name: '教师', role: 'teacher', division: 'JUNIOR' })

    const response = await GET(new NextRequest('http://localhost/api/exam-papers?teacherId=teacher-2'))

    expect(response.status).toBe(403)
    expect(findMany).not.toHaveBeenCalled()
  })

  it('requires a teacher-student relationship when creating without a lesson', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user', email: 't@example.com', name: '教师', role: 'teacher', division: 'JUNIOR' })
    mocks.assertCanAccessStudent.mockRejectedValue(new Error('无权访问该学生数据'))
    const request = new NextRequest('http://localhost/api/exam-papers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'foreign-student', title: '试卷', subject: '数学' }),
    })

    await expect(POST(request)).rejects.toThrow('无权访问该学生数据')
    expect(mocks.assertCanAccessStudent).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: 'teacher-1' }),
      'foreign-student',
    )
    expect(mocks.resolveLearningRecordTermId).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('requires a teacher-owned lesson when creating against a specific lesson', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user', email: 't@example.com', name: '教师', role: 'teacher', division: 'JUNIOR' })
    mocks.assertCanAccessClassLesson.mockRejectedValue(new Error('无权访问该课次数据'))
    const request = new NextRequest('http://localhost/api/exam-papers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'student-1', classLessonId: 'foreign-lesson', title: '试卷', subject: '数学' }),
    })

    await expect(POST(request)).rejects.toThrow('无权访问该课次数据')
    expect(mocks.assertCanAccessClassLesson).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: 'teacher-1' }),
      'foreign-lesson',
    )
    expect(mocks.resolveLearningRecordTermId).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })
})
