import { describe, expect, it } from 'vitest'
import { buildLatestFeedbackDateByStudent } from './teacher-feedback-freshness'

describe('teacher feedback freshness', () => {
  it('recognizes a published classroom feedback when no legacy performance post exists', () => {
    const classroomFeedbackAt = new Date('2026-07-25T10:00:00+08:00')
    const latest = buildLatestFeedbackDateByStudent(
      [{ id: 'student-a', performancePosts: [] }],
      [{ studentIds: ['student-a'], createdAt: classroomFeedbackAt }],
    )

    expect(latest.get('student-a')).toEqual(classroomFeedbackAt)
  })

  it('uses the latest record across classroom feedback and legacy performance posts', () => {
    const performancePostAt = new Date('2026-07-20T10:00:00+08:00')
    const classroomFeedbackAt = new Date('2026-07-25T10:00:00+08:00')
    const latest = buildLatestFeedbackDateByStudent(
      [{
        id: 'student-a',
        performancePosts: [{ createdAt: performancePostAt }],
      }],
      [{ studentIds: ['student-a'], createdAt: classroomFeedbackAt }],
    )

    expect(latest.get('student-a')).toEqual(classroomFeedbackAt)
  })

  it('credits a multi-student classroom feedback to every included student', () => {
    const createdAt = new Date('2026-07-25T10:00:00+08:00')
    const latest = buildLatestFeedbackDateByStudent(
      [
        { id: 'student-a', performancePosts: [] },
        { id: 'student-b', performancePosts: [] },
      ],
      [{ studentIds: ['student-a', 'student-b'], createdAt }],
    )

    expect(latest.get('student-a')).toEqual(createdAt)
    expect(latest.get('student-b')).toEqual(createdAt)
  })
})
