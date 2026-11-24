import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn() }))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

function request(newStatus: string) {
  return new NextRequest('http://localhost/api/admin/attendance/adjust', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lessonId: 'lesson-a', studentId: 'student-a', newStatus, reason: '核对家长请假记录' }),
  })
}

function database(termKind: 'WEEKEND' | 'SUMMER') {
  const tx = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({ totalHours: 10, remainHours: 8.5, usedHours: 1.5 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([{ remainHours: 10, totalHours: 10 }]),
    },
    attendance: {
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    hourTransaction: { create: vi.fn().mockResolvedValue({}) },
    student: { update: vi.fn().mockResolvedValue({}) },
    activityLog: { create: vi.fn().mockResolvedValue({}) },
    makeupRequest: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
  }
  const db = {
    attendance: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'attendance-a',
        lessonId: 'lesson-a',
        studentId: 'student-a',
        enrollmentId: 'enrollment-a',
        status: 'PRESENT',
        hoursDeducted: 1.5,
        actualMinutes: 90,
        student: { name: '学员甲' },
      }),
    },
    classLesson: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'lesson-a',
        group: {
          name: `${termKind} 数学班`,
          lessonMinutes: 90,
          intensiveMode: 'NORMAL',
          course: { type: 'GROUP' },
          term: { kind: termKind },
        },
      }),
    },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    tx,
  }
  mocks.getRequestPrisma.mockResolvedValue(db)
  return db
}

describe('POST /api/admin/attendance/adjust', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-a', role: 'admin' })
  })

  it('refunds the previous attendance charge when correcting weekend leave', async () => {
    const db = database('WEEKEND')
    const response = await POST(request('LEAVE'))

    expect(response.status).toBe(200)
    expect(db.tx.enrollment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'enrollment-a', usedHours: { gte: 1.5 } },
      data: { remainHours: { increment: 1.5 }, usedHours: { decrement: 1.5 } },
    }))
    expect(db.tx.attendance.update).toHaveBeenLastCalledWith({
      where: { id: 'attendance-a' },
      data: { status: 'LEAVE', hoursDeducted: 0 },
    })
    expect(db.tx.hourTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'ATTENDANCE_REFUND', amount: 1.5 }),
    }))
  })

  it('keeps the charge when correcting leave in a summer batch', async () => {
    const db = database('SUMMER')
    const response = await POST(request('LEAVE'))

    expect(response.status).toBe(200)
    expect(db.tx.enrollment.updateMany).not.toHaveBeenCalled()
    expect(db.tx.hourTransaction.create).not.toHaveBeenCalled()
    expect(db.tx.attendance.update).toHaveBeenCalledWith({
      where: { id: 'attendance-a' },
      data: { status: 'LEAVE', hoursDeducted: 1.5 },
    })
  })

  it('can repair an already recorded weekend leave without changing its status', async () => {
    const db = database('WEEKEND')
    db.attendance.findFirst.mockResolvedValue({
      id: 'attendance-a',
      lessonId: 'lesson-a',
      studentId: 'student-a',
      enrollmentId: 'enrollment-a',
      status: 'LEAVE',
      hoursDeducted: 1.5,
      actualMinutes: 90,
      student: { name: '学员甲' },
    })
    const response = await POST(request('LEAVE'))

    expect(response.status).toBe(200)
    expect(db.tx.enrollment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'enrollment-a', usedHours: { gte: 1.5 } },
      data: { remainHours: { increment: 1.5 }, usedHours: { decrement: 1.5 } },
    }))
    expect(db.tx.attendance.update).toHaveBeenLastCalledWith({
      where: { id: 'attendance-a' },
      data: { status: 'LEAVE', hoursDeducted: 0 },
    })
  })

  it('returns a clear no-op result when the same status already matches the batch charge', async () => {
    const db = database('WEEKEND')
    const response = await POST(request('PRESENT'))

    expect(response.status).toBe(200)
    expect((await response.json()).message).toBe('当前考勤及课时已符合所属批次规则')
    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(db.tx.attendance.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'attendance-a',
        lessonId: 'lesson-a',
        studentId: 'student-a',
        deletedAt: null,
        status: 'PRESENT',
        hoursDeducted: 1.5,
      },
      data: { status: 'PRESENT' },
    })
    expect(db.tx.activityLog.create).not.toHaveBeenCalled()
  })

  it('prevents simultaneous corrections from refunding the same attendance twice', async () => {
    const db = database('WEEKEND')
    let reads = 0
    let releaseReads!: () => void
    const bothReadsStarted = new Promise<void>((resolve) => { releaseReads = resolve })
    const attendanceSnapshot = {
      id: 'attendance-a',
      lessonId: 'lesson-a',
      studentId: 'student-a',
      enrollmentId: 'enrollment-a',
      status: 'PRESENT',
      hoursDeducted: 1.5,
      actualMinutes: 90,
      student: { name: '学员甲' },
    }
    db.attendance.findFirst.mockImplementation(async () => {
      reads += 1
      if (reads === 2) releaseReads()
      await bothReadsStarted
      return attendanceSnapshot
    })
    db.tx.attendance.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })

    const responses = await Promise.all([POST(request('LEAVE')), POST(request('LEAVE'))])

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409])
    expect(db.tx.attendance.updateMany).toHaveBeenCalledTimes(2)
    expect(db.tx.enrollment.updateMany).toHaveBeenCalledTimes(1)
    expect(db.tx.hourTransaction.create).toHaveBeenCalledTimes(1)
  })
})
