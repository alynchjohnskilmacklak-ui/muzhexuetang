import { describe, expect, it } from 'vitest'
import { resolveLessonFeedbackBlockReasons, resolvePendingFeedbackStudentIds } from './lesson-eligibility'

const lessonDate = new Date('2026-10-28T16:00:00.000Z') // 2026-10-29 in Asia/Shanghai

describe('lesson feedback eligibility', () => {
  it('counts only uncovered students who are allowed to receive feedback', () => {
    expect(resolvePendingFeedbackStudentIds(
      ['present', 'absent', 'leave', 'already-covered', 'present'],
      ['already-covered'],
      { absent: 'ABSENT', leave: 'LEAVE' },
    )).toEqual(['present'])
  })

  it('blocks LEAVE and ABSENT attendance while allowing students who attended', () => {
    const result = resolveLessonFeedbackBlockReasons({
      lessonId: 'lesson-a',
      lessonDate,
      studentIds: ['leave', 'absent', 'present', 'late', 'makeup'],
      attendances: [
        { lessonId: 'lesson-a', studentId: 'leave', status: 'LEAVE' },
        { lessonId: 'lesson-a', studentId: 'absent', status: 'ABSENT' },
        { lessonId: 'lesson-a', studentId: 'present', status: 'PRESENT' },
        { lessonId: 'lesson-a', studentId: 'late', status: 'LATE' },
        { lessonId: 'lesson-a', studentId: 'makeup', status: 'MAKEUP' },
      ],
      leaveRequests: [],
    })

    expect(result).toEqual({ leave: 'LEAVE', absent: 'ABSENT' })
  })

  it('blocks pending and approved date-only leave requests on the Shanghai lesson day', () => {
    const result = resolveLessonFeedbackBlockReasons({
      lessonId: 'lesson-a',
      lessonDate,
      studentIds: ['pending', 'approved', 'other-day', 'other-lesson'],
      attendances: [],
      leaveRequests: [
        { studentId: 'pending', lessonId: null, leaveDate: new Date('2026-10-28T16:05:00.000Z'), status: 'pending' },
        { studentId: 'approved', lessonId: null, leaveDate: '2026-10-29', status: 'approved' },
        { studentId: 'other-day', lessonId: null, leaveDate: '2026-10-30', status: 'approved' },
        { studentId: 'other-lesson', lessonId: 'lesson-b', leaveDate: '2026-10-29', status: 'approved' },
      ],
    })

    expect(result).toEqual({ pending: 'LEAVE', approved: 'LEAVE' })
  })

  it('lets present attendance override an active leave request and ignores rejected or deleted requests', () => {
    const result = resolveLessonFeedbackBlockReasons({
      lessonId: 'lesson-a',
      lessonDate,
      studentIds: ['attended', 'rejected', 'deleted'],
      attendances: [{ lessonId: 'lesson-a', studentId: 'attended', status: 'PRESENT' }],
      leaveRequests: [
        { studentId: 'attended', lessonId: null, leaveDate: '2026-10-29', status: 'pending' },
        { studentId: 'rejected', lessonId: null, leaveDate: '2026-10-29', status: 'rejected' },
        { studentId: 'deleted', lessonId: null, leaveDate: '2026-10-29', status: 'approved', deletedAt: new Date() },
      ],
    })

    expect(result).toEqual({})
  })

  it('uses a lesson-linked leave request even if its stored date differs', () => {
    const result = resolveLessonFeedbackBlockReasons({
      lessonId: 'lesson-a',
      lessonDate,
      studentIds: ['linked', 'unrelated'],
      attendances: [],
      leaveRequests: [
        { studentId: 'linked', lessonId: 'lesson-a', leaveDate: '2026-10-28', status: 'approved' },
        { studentId: 'unrelated', lessonId: 'lesson-b', leaveDate: '2026-10-29', status: 'approved' },
      ],
    })

    expect(result).toEqual({ linked: 'LEAVE' })
  })
})
