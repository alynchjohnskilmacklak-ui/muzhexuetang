import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { checkScheduleConflict, hasTimeOverlap } from './schedule-conflict'

function lessonOn(date: string) {
  return {
    id: `lesson-${date}`,
    lessonDate: new Date(`${date}T00:00:00+08:00`),
    startTime: '14:00',
    endTime: '15:00',
    teacher: { name: '胡思同' },
    group: {
      course: { name: '数学个性化课程' },
      room: { name: '临时座位' },
    },
  }
}

describe('schedule conflict', () => {
  it('recognizes overlapping time ranges', () => {
    expect(hasTimeOverlap('14:00', '15:30', '14:00', '15:00')).toBe(true)
    expect(hasTimeOverlap('15:00', '16:00', '14:00', '15:00')).toBe(false)
  })

  it('never reports the same clock time on a different date as a conflict', async () => {
    const findMany = vi.fn()
      .mockResolvedValueOnce([lessonOn('2026-07-10')])
      .mockResolvedValueOnce([lessonOn('2026-07-10')])

    const prisma = {
      classLesson: { findMany },
    } as unknown as PrismaClient

    const conflicts = await checkScheduleConflict({
      teacherId: 'teacher-1',
      studentId: 'student-1',
      date: '2026-07-11',
      startTime: '14:00',
      endTime: '15:30',
    }, prisma)

    expect(conflicts).toEqual([])
    expect(findMany).toHaveBeenCalledTimes(2)
  })

  it('still blocks a real teacher and student overlap on the same date', async () => {
    const findMany = vi.fn()
      .mockResolvedValueOnce([lessonOn('2026-07-10')])
      .mockResolvedValueOnce([lessonOn('2026-07-10')])

    const prisma = {
      classLesson: { findMany },
    } as unknown as PrismaClient

    const conflicts = await checkScheduleConflict({
      teacherId: 'teacher-1',
      studentId: 'student-1',
      date: '2026-07-10',
      startTime: '14:00',
      endTime: '15:30',
    }, prisma)

    expect(conflicts.map((item) => item.type)).toEqual(['teacher', 'student'])
  })
})
