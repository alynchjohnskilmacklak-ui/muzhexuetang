import { describe, expect, it, vi } from 'vitest'
import { postAttendanceHours, refundAttendanceHours } from '@/lib/attendance-hour-posting'

function baseInput(totalHours: number) {
  return {
    attendanceId: 'attendance-1',
    enrollmentId: 'enrollment-1',
    enrollmentTotalHours: totalHours,
    studentId: 'student-1',
    lessonId: 'lesson-1',
    groupName: '周末数学班',
    operatorId: 'operator-1',
    hours: 1.5,
  }
}

describe('postAttendanceHours', () => {
  it('posts positive hours for accrual-mode enrollment', async () => {
    const tx = {
      enrollment: {
        findUnique: vi.fn().mockResolvedValue({ usedHours: 2 }),
        update: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
      },
      student: { update: vi.fn().mockResolvedValue({}) },
      attendance: { update: vi.fn().mockResolvedValue({}) },
      hourTransaction: { create: vi.fn().mockResolvedValue({}) },
    }

    await expect(postAttendanceHours(tx as never, baseInput(0))).resolves.toEqual({
      posted: true,
      mode: 'accrual',
      amount: 1.5,
      beforeHours: 2,
      afterHours: 3.5,
    })
    expect(tx.hourTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 1.5, type: 'ATTENDANCE_ACCRUE' }),
    }))
  })

  it('posts negative hours for prepaid enrollment', async () => {
    let remainHours = 5
    const tx = {
      enrollment: {
        findUnique: vi.fn(async () => ({ remainHours })),
        updateMany: vi.fn(async ({ data }: { data: { remainHours: { decrement: number } } }) => {
          remainHours -= data.remainHours.decrement
          return { count: 1 }
        }),
        findMany: vi.fn(async () => [{ remainHours, totalHours: 10 }]),
      },
      student: { update: vi.fn().mockResolvedValue({}) },
      attendance: { update: vi.fn().mockResolvedValue({}) },
      hourTransaction: { create: vi.fn().mockResolvedValue({}) },
    }

    await expect(postAttendanceHours(tx as never, baseInput(10))).resolves.toEqual({
      posted: true,
      mode: 'deduction',
      amount: 1.5,
      beforeHours: 5,
      afterHours: 3.5,
    })
    expect(tx.hourTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: -1.5, type: 'ATTENDANCE_DEDUCT' }),
    }))
    expect(tx.student.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { remainHours: 3.5, totalHours: 10 },
    }))
  })
})

describe('refundAttendanceHours', () => {
  it('returns prepaid balance and decreases used hours when an attendance charge is reversed', async () => {
    let remainHours = 8.5
    let usedHours = 1.5
    const tx = {
      enrollment: {
        findUnique: vi.fn().mockImplementation(async () => ({ totalHours: 10, remainHours, usedHours })),
        updateMany: vi.fn().mockImplementation(async ({ data }: { data: { remainHours?: { increment: number }; usedHours: { decrement: number } } }) => {
          remainHours += data.remainHours?.increment || 0
          usedHours -= data.usedHours.decrement
          return { count: 1 }
        }),
        findMany: vi.fn().mockImplementation(async () => [{ remainHours, totalHours: 10 }]),
      },
      attendance: { update: vi.fn().mockResolvedValue({}) },
      hourTransaction: { create: vi.fn().mockResolvedValue({}) },
      student: { update: vi.fn().mockResolvedValue({}) },
    }

    await expect(refundAttendanceHours(tx as never, {
      attendanceId: 'attendance-1',
      enrollmentId: 'enrollment-1',
      studentId: 'student-1',
      lessonId: 'lesson-1',
      operatorId: 'admin-1',
      previousHours: 1.5,
      targetHours: 0,
      reason: '批准周末课请假退回课时',
    })).resolves.toMatchObject({ refunded: 1.5, beforeHours: 8.5, afterHours: 10 })

    expect(tx.attendance.update).toHaveBeenCalledWith({
      where: { id: 'attendance-1' },
      data: { hoursDeducted: 0 },
    })
    expect(tx.hourTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 1.5, type: 'ATTENDANCE_REFUND', afterHours: 10 }),
    }))
    expect(tx.student.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { remainHours: 10, totalHours: 10 },
    }))
  })

  it('refuses to create a refund if the enrollment usage no longer covers it', async () => {
    const tx = {
      enrollment: {
        findUnique: vi.fn().mockResolvedValue({ totalHours: 10, remainHours: 0, usedHours: 1 }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    }

    await expect(refundAttendanceHours(tx as never, {
      attendanceId: 'attendance-1',
      enrollmentId: 'enrollment-1',
      studentId: 'student-1',
      lessonId: 'lesson-1',
      operatorId: 'admin-1',
      previousHours: 1.5,
      targetHours: 0,
      reason: '测试',
    })).rejects.toThrow('ENROLLMENT_REFUND_CONFLICT')
  })
})
