import { describe, expect, it, vi } from 'vitest'
import { postAttendanceHours } from '@/lib/attendance-hour-posting'

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
      },
      attendance: { update: vi.fn().mockResolvedValue({}) },
      hourTransaction: { create: vi.fn().mockResolvedValue({}) },
    }

    await expect(postAttendanceHours(tx as never, baseInput(0))).resolves.toEqual({
      posted: true,
      mode: 'accrual',
      amount: 1.5,
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
      },
      attendance: { update: vi.fn().mockResolvedValue({}) },
      hourTransaction: { create: vi.fn().mockResolvedValue({}) },
    }

    await expect(postAttendanceHours(tx as never, baseInput(10))).resolves.toEqual({
      posted: true,
      mode: 'deduction',
      amount: 1.5,
    })
    expect(tx.hourTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: -1.5, type: 'ATTENDANCE_DEDUCT' }),
    }))
  })
})
