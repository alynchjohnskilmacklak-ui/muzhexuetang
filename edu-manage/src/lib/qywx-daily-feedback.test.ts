import type { PrismaClient } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { getParentDailyFeedbackReadiness } from './qywx-daily-feedback'

const now = new Date('2026-10-29T14:00:00.000Z') // 22:00 Asia/Shanghai

function makePrisma(input: {
  endTime?: string
  attendanceSubmittedAt?: Date | null
  status?: string
  feedbacked?: boolean
}) {
  const lesson = {
    id: 'lesson-1',
    groupId: 'group-1',
    teacherId: 'teacher-1',
    lessonDate: new Date('2026-10-29T00:00:00+08:00'),
    startTime: '18:00',
    endTime: input.endTime ?? '19:30',
    status: input.status ?? 'SCHEDULED',
    attendanceSubmittedAt: input.attendanceSubmittedAt ?? null,
    lessonStudents: [{ studentId: 'student-1' }],
    attendances: input.attendanceSubmittedAt ? [{ studentId: 'student-1' }] : [],
    classroomFeedbacks: input.feedbacked ? [{ studentIds: ['student-1'] }] : [],
    group: { teacherId: 'teacher-1', enrollments: [{ studentId: 'student-1' }] },
  }

  return {
    student: { findMany: async () => [{ id: 'student-1' }] },
    classLesson: { findMany: async () => [lesson] },
    classroomFeedback: { findMany: async () => [] },
  } as unknown as PrismaClient
}

describe('parent daily digest readiness', () => {
  it('waits for attendance on an ended lesson before considering its feedback complete', async () => {
    const result = await getParentDailyFeedbackReadiness(makePrisma({}), 'parent-1', '2026-10-29', now)

    expect(result).toEqual({ pendingAttendanceCount: 1, pendingFeedbackCount: 0, pendingLessonCount: 1 })
  })

  it('does not count a lesson that has not ended as pending teacher work', async () => {
    const result = await getParentDailyFeedbackReadiness(makePrisma({ endTime: '23:00' }), 'parent-1', '2026-10-29', now)

    expect(result).toEqual({ pendingAttendanceCount: 0, pendingFeedbackCount: 0, pendingLessonCount: 0 })
  })

  it('waits for published feedback after attendance has been submitted', async () => {
    const attendanceSubmittedAt = new Date('2026-10-29T11:30:00.000Z')
    const missingFeedback = await getParentDailyFeedbackReadiness(
      makePrisma({ attendanceSubmittedAt }),
      'parent-1',
      '2026-10-29',
      now,
    )
    const complete = await getParentDailyFeedbackReadiness(
      makePrisma({ attendanceSubmittedAt, feedbacked: true }),
      'parent-1',
      '2026-10-29',
      now,
    )

    expect(missingFeedback).toEqual({ pendingAttendanceCount: 0, pendingFeedbackCount: 1, pendingLessonCount: 1 })
    expect(complete).toEqual({ pendingAttendanceCount: 0, pendingFeedbackCount: 0, pendingLessonCount: 0 })
  })
})
