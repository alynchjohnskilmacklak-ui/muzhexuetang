import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getRequestPrisma: vi.fn(),
  requireCurrentTeacher: vi.fn(),
  teacherStudentWhere: vi.fn(),
  createNotification: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/teacher-portal', () => ({
  requireCurrentTeacher: mocks.requireCurrentTeacher,
  teacherStudentWhere: mocks.teacherStudentWhere,
}))
vi.mock('@/lib/notifications', () => ({ createNotification: mocks.createNotification }))

import { PATCH } from './route'

function request(status: 'approved' | 'rejected' = 'approved') {
  return new NextRequest('http://localhost/api/leave-requests/leave-a', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, replyNote: '已收到' }),
  })
}

const approvedRecord = {
  id: 'leave-a',
  status: 'approved',
  leaveDate: new Date('2026-10-30T00:00:00.000Z'),
  reason: '身体不适',
  student: { id: 'student-a', name: '学员甲', parentId: 'parent-a', parentUserId: null },
  lesson: null,
}

function database(updateCount = 1) {
  const db = {
    leaveRequest: {
      findFirst: vi.fn()
        .mockResolvedValueOnce({ id: 'leave-a', status: 'pending' })
        .mockResolvedValueOnce(approvedRecord),
      updateMany: vi.fn().mockResolvedValue({ count: updateCount }),
    },
    notification: { create: vi.fn().mockResolvedValue({ id: 'notification-a' }) },
    attendance: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({ totalHours: 10, remainHours: 8.5, usedHours: 1.5 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    hourTransaction: { create: vi.fn().mockResolvedValue({}) },
    student: { update: vi.fn().mockResolvedValue({}) },
    activityLog: { create: vi.fn().mockResolvedValue({ id: 'activity-a' }) },
    $transaction: vi.fn(),
  }
  db.$transaction.mockImplementation((operation) => operation(db))
  mocks.getRequestPrisma.mockResolvedValue(db)
  return db
}

describe('PATCH /api/leave-requests/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'admin-a', role: 'admin', division: 'JUNIOR' } })
    mocks.teacherStudentWhere.mockReturnValue({ id: { in: ['student-a'] } })
    mocks.requireCurrentTeacher.mockResolvedValue({ teacher: { id: 'teacher-a' } })
    mocks.createNotification.mockResolvedValue({ id: 'notification-a' })
  })

  it('limits administrators to their own division and updates only pending requests', async () => {
    const db = database()
    const response = await PATCH(request(), { params: Promise.resolve({ id: 'leave-a' }) })

    expect(response.status).toBe(200)
    expect(db.leaveRequest.findFirst).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: 'leave-a', deletedAt: null, student: { division: 'JUNIOR' } },
    }))
    expect(db.leaveRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'leave-a', deletedAt: null, status: 'pending', student: { division: 'JUNIOR' } },
      data: expect.objectContaining({ status: 'approved', replyNote: '已收到' }),
    }))
    expect(mocks.createNotification).toHaveBeenCalledTimes(1)
    expect(db.attendance.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        studentId: 'student-a',
        status: { in: ['PRESENT', 'LEAVE'] },
        lesson: { is: expect.objectContaining({ deletedAt: null }) },
      }),
    }))
    expect(db.activityLog.create).toHaveBeenCalledTimes(1)
  })

  it('does not notify or log when another request already processed the leave', async () => {
    const db = database(0)
    const response = await PATCH(request('rejected'), { params: Promise.resolve({ id: 'leave-a' }) })

    expect(response.status).toBe(409)
    expect(mocks.createNotification).not.toHaveBeenCalled()
    expect(db.attendance.findMany).not.toHaveBeenCalled()
    expect(db.activityLog.create).not.toHaveBeenCalled()
  })

  it('limits attendance correction to the explicitly linked lesson', async () => {
    const db = database()
    db.leaveRequest.findFirst.mockReset()
      .mockResolvedValueOnce({ id: 'leave-a', status: 'pending' })
      .mockResolvedValueOnce({ ...approvedRecord, lessonId: 'lesson-a', lesson: { id: 'lesson-a' } })

    const response = await PATCH(request(), { params: Promise.resolve({ id: 'leave-a' }) })

    expect(response.status).toBe(200)
    expect(db.attendance.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        studentId: 'student-a',
        lessonId: 'lesson-a',
        lesson: { is: expect.objectContaining({ status: { notIn: ['CANCELLED', 'POSTPONED'] } }) },
      }),
    }))
  })

  it('limits teacher approvals to their own students', async () => {
    const db = database()
    mocks.auth.mockResolvedValue({ user: { id: 'teacher-user', role: 'teacher', division: 'SENIOR' } })
    const response = await PATCH(request(), { params: Promise.resolve({ id: 'leave-a' }) })

    expect(response.status).toBe(200)
    expect(mocks.teacherStudentWhere).toHaveBeenCalledWith('teacher-a')
    expect(db.leaveRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ student: { id: { in: ['student-a'] } }, status: 'pending' }),
    }))
  })

  it('refunds hours when an approved leave overrides a weekend attendance charge', async () => {
    const db = database()
    db.attendance.findMany.mockResolvedValue([{
      id: 'attendance-a',
      lessonId: 'lesson-a',
      enrollmentId: 'enrollment-a',
      hoursDeducted: 1.5,
      actualMinutes: 90,
      enrollment: { id: 'enrollment-a', totalHours: 10 },
      lesson: { group: {
        name: '周末数学班',
        lessonMinutes: 90,
        intensiveMode: 'NORMAL',
        course: { type: 'GROUP' },
        term: { kind: 'WEEKEND' },
      } },
    }])

    const response = await PATCH(request(), { params: Promise.resolve({ id: 'leave-a' }) })

    expect(response.status).toBe(200)
    expect(db.enrollment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'enrollment-a', usedHours: { gte: 1.5 } },
      data: { remainHours: { increment: 1.5 }, usedHours: { decrement: 1.5 } },
    }))
    expect(db.hourTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 1.5, type: 'ATTENDANCE_REFUND' }),
    }))
    expect(db.attendance.update).toHaveBeenCalledWith({
      where: { id: 'attendance-a' },
      data: { status: 'LEAVE', hoursDeducted: 0 },
    })
  })

  it('keeps the charge when an approved leave belongs to a monthly holiday batch', async () => {
    const db = database()
    db.attendance.findMany.mockResolvedValue([{
      id: 'attendance-a',
      lessonId: 'lesson-a',
      enrollmentId: 'enrollment-a',
      hoursDeducted: 1.5,
      actualMinutes: 90,
      enrollment: { id: 'enrollment-a', totalHours: 10 },
      lesson: { group: {
        name: '暑假数学班',
        lessonMinutes: 90,
        intensiveMode: 'NORMAL',
        course: { type: 'GROUP' },
        term: { kind: 'SUMMER' },
      } },
    }])

    const response = await PATCH(request(), { params: Promise.resolve({ id: 'leave-a' }) })

    expect(response.status).toBe(200)
    expect(db.enrollment.updateMany).not.toHaveBeenCalled()
    expect(db.hourTransaction.create).not.toHaveBeenCalled()
    expect(db.attendance.update).toHaveBeenCalledWith({
      where: { id: 'attendance-a' },
      data: { status: 'LEAVE', hoursDeducted: 1.5 },
    })
  })

  it('also reconciles a teacher-recorded weekend leave when the parent request is approved', async () => {
    const db = database()
    db.attendance.findMany.mockResolvedValue([{
      id: 'attendance-a',
      lessonId: 'lesson-a',
      enrollmentId: 'enrollment-a',
      status: 'LEAVE',
      hoursDeducted: 1.5,
      actualMinutes: 90,
      enrollment: { id: 'enrollment-a', totalHours: 10 },
      lesson: { group: {
        name: '周末数学班', lessonMinutes: 90, intensiveMode: 'NORMAL',
        course: { type: 'GROUP' }, term: { kind: 'WEEKEND' },
      } },
    }])

    const response = await PATCH(request(), { params: Promise.resolve({ id: 'leave-a' }) })

    expect(response.status).toBe(200)
    expect(db.enrollment.updateMany).toHaveBeenCalled()
    expect(db.hourTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 1.5, type: 'ATTENDANCE_REFUND' }),
    }))
  })
})
