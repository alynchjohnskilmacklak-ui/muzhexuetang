import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { checkScheduleConflict, findStudentLessonConflicts, hasTimeOverlap } from './schedule-conflict'

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
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deletedAt: null, group: expect.objectContaining({ deletedAt: null }) }),
    }))
  })
})

describe('findStudentLessonConflicts', () => {
  const conflictLesson = {
    id: 'lesson-b',
    lessonDate: new Date('2026-07-10T00:00:00+08:00'),
    startTime: '14:30',
    endTime: '16:00',
    group: {
      course: { name: '少儿编程' },
      enrollments: [
        { student: { id: 's1', name: '李四' } },
        { student: { id: 's2', name: '王五' } },
      ],
    },
  }

  it('returns conflicts when a student already has an overlapping lesson', async () => {
    const prisma = {
      classLesson: { findMany: vi.fn().mockResolvedValueOnce([conflictLesson]) },
    } as unknown as PrismaClient

    const conflicts = await findStudentLessonConflicts(prisma, {
      studentIds: ['s1', 's2'],
      date: new Date('2026-07-10T00:00:00+08:00'),
      startTime: '14:00',
      endTime: '15:30',
      excludeLessonId: 'lesson-a',
    })

    expect(conflicts).toHaveLength(2)
    expect(conflicts[0]).toMatchObject({ studentName: '李四', courseName: '少儿编程', timeRange: '14:30-16:00', lessonId: 'lesson-b' })
  })

  it('returns empty when the existing lesson does not overlap', async () => {
    const prisma = {
      classLesson: { findMany: vi.fn().mockResolvedValueOnce([conflictLesson]) },
    } as unknown as PrismaClient

    const conflicts = await findStudentLessonConflicts(prisma, {
      studentIds: ['s1'],
      date: new Date('2026-07-10T00:00:00+08:00'),
      startTime: '09:00',
      endTime: '10:00',
    })

    expect(conflicts).toEqual([])
  })

  it('returns empty immediately for an empty student list', async () => {
    const prisma = {
      classLesson: { findMany: vi.fn() },
    } as unknown as PrismaClient

    const conflicts = await findStudentLessonConflicts(prisma, {
      studentIds: [],
      date: new Date('2026-07-10T00:00:00+08:00'),
      startTime: '14:00',
      endTime: '15:00',
    })

    expect(conflicts).toEqual([])
    expect(prisma.classLesson.findMany).not.toHaveBeenCalled()
  })
})

