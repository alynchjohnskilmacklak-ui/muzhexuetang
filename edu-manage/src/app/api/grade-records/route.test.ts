import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

describe('POST /api/grade-records', () => {
  const assessmentFindFirst = vi.fn()
  const gradeFindFirst = vi.fn()
  const gradeCreate = vi.fn()
  const gradeUpdate = vi.fn()
  const gradeUpdateMany = vi.fn()
  const assessmentUpdate = vi.fn()
  const userFindMany = vi.fn()
  const notificationCreateMany = vi.fn()
  const dimensionDeleteMany = vi.fn()
  const dimensionCreateMany = vi.fn()
  const transaction = vi.fn()
  const activityCreate = vi.fn()
  const prisma = {
    assessment: { findFirst: assessmentFindFirst },
    user: { findMany: userFindMany },
    $transaction: transaction,
    activityLog: { create: activityCreate },
  }
  const tx = {
    assessment: { update: assessmentUpdate },
    gradeRecord: { findFirst: gradeFindFirst, create: gradeCreate, update: gradeUpdate, updateMany: gradeUpdateMany },
    dimensionScore: { deleteMany: dimensionDeleteMany, createMany: dimensionCreateMany },
    notification: { createMany: notificationCreateMany },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    assessmentFindFirst.mockResolvedValue({
      name: '阶段测评', fullScore: 100, absentStudentIds: [], notifiedAbsentStudentIds: [],
      group: { termId: 'term-1', enrollments: [
        { studentId: 'student-1', student: { name: '学生一', parentId: 'parent-1', parentUserId: null } },
        { studentId: 'student-2', student: { name: '学生二', parentId: 'parent-2', parentUserId: null } },
      ] },
    })
    gradeFindFirst.mockResolvedValue({ id: 'grade-1' })
    gradeUpdate.mockResolvedValue({ id: 'grade-1', score: 88 })
    gradeCreate.mockResolvedValue({ id: 'grade-new', score: 92 })
    gradeUpdateMany.mockResolvedValue({ count: 1 })
    assessmentUpdate.mockResolvedValue({})
    userFindMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.map((id) => ({ id })))
    notificationCreateMany.mockResolvedValue({ count: 2 })
    transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
  })

  it('updates the existing grade instead of creating duplicate rows', async () => {
    const response = await POST(new NextRequest('http://localhost/api/grade-records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: 'assessment-1', records: [{ studentId: 'student-1', score: 88, comment: '进步明显' }] }),
    }))

    expect(response.status).toBe(201)
    expect(gradeUpdate).toHaveBeenCalledWith({ where: { id: 'grade-1' }, data: { score: 88, comment: '进步明显', notifySent: false } })
    expect(gradeCreate).not.toHaveBeenCalled()
  })

  it('rejects scores above the assessment full score before writing', async () => {
    const response = await POST(new NextRequest('http://localhost/api/grade-records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: 'assessment-1', records: [{ studentId: 'student-1', score: 101 }] }),
    }))

    expect(response.status).toBe(400)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('rejects duplicate students in one batch', async () => {
    const response = await POST(new NextRequest('http://localhost/api/grade-records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: 'assessment-1', records: [
        { studentId: 'student-1', score: 88 }, { studentId: 'student-1', score: 90 },
      ] }),
    }))

    expect(response.status).toBe(400)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('requires a score or explicit absence for every active student before notifying parents', async () => {
    const response = await POST(new NextRequest('http://localhost/api/grade-records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: 'assessment-1', records: [{ studentId: 'student-1', score: 88 }], absentStudentIds: [], notifyParents: true }),
    }))

    expect(response.status).toBe(409)
    expect(transaction).not.toHaveBeenCalled()
    expect(userFindMany).not.toHaveBeenCalled()
  })

  it('saves full-roster scores and absences, then creates parent notifications', async () => {
    gradeFindFirst.mockResolvedValueOnce(null)

    const response = await POST(new NextRequest('http://localhost/api/grade-records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: 'assessment-1',
        records: [{ studentId: 'student-1', score: 92 }],
        absentStudentIds: ['student-2'],
        replaceRosterState: true,
        notifyParents: true,
      }),
    }))

    expect(response.status).toBe(201)
    expect(assessmentUpdate).toHaveBeenCalledWith({
      where: { id: 'assessment-1' },
      data: { absentStudentIds: ['student-2'], notifiedAbsentStudentIds: ['student-2'] },
    })
    expect(gradeCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ assessmentId: 'assessment-1', studentId: 'student-1', score: 92, notifySent: true }),
    }))
    const notifications = notificationCreateMany.mock.calls[0][0].data
    expect(notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 'parent-1', studentId: 'student-1', relatedType: 'GRADE_RECORD' }),
      expect.objectContaining({ userId: 'parent-2', studentId: 'student-2', relatedType: 'ASSESSMENT_ABSENCE' }),
    ]))
  })
})
