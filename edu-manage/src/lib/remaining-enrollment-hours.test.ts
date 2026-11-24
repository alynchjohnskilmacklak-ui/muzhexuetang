import { describe, expect, it } from 'vitest'
import { countRemainingEnrollmentLessons } from './remaining-enrollment-hours'

const enrollment = (subjects: string[], enrolledAt = new Date('2026-10-29T08:00:00+08:00')) => ({ subjects, enrolledAt })
const lesson = (overrides: Partial<{
  lessonDate: Date
  startTime: string
  subject: string | null
  status: string
  deletedAt: Date | null
}> = {}) => ({
  lessonDate: new Date('2026-10-31T00:00:00.000Z'),
  startTime: '09:00',
  subject: '数学',
  status: 'SCHEDULED',
  deletedAt: null,
  ...overrides,
})

describe('countRemainingEnrollmentLessons', () => {
  it('counts only the enrolled subject and excludes completed, cancelled, deleted, and pre-enrollment sessions', () => {
    const lessons = [
      lesson(),
      lesson({ subject: '英语' }),
      lesson({ status: 'COMPLETED' }),
      lesson({ status: 'CANCELLED' }),
      lesson({ deletedAt: new Date() }),
      lesson({ lessonDate: new Date('2026-10-28T00:00:00.000Z') }),
    ]

    expect(countRemainingEnrollmentLessons(enrollment(['数学']), lessons, '数学')).toBe(1)
  })

  it('uses the course subject when a session has no explicit subject', () => {
    expect(countRemainingEnrollmentLessons(
      enrollment(['英语']),
      [lesson({ subject: null })],
      '英语',
    )).toBe(1)
  })

  it('does not silently treat an empty enrollment subject list as every subject', () => {
    expect(countRemainingEnrollmentLessons(enrollment([]), [lesson()], '数学')).toBe(0)
  })
})
