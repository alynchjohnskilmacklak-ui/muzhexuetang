import { describe, expect, it } from 'vitest'
import { selectReplacementTeachingDay } from './class-schedule-plan'

describe('class schedule plan', () => {
  it('selects the latest future day with the same lesson count', () => {
    const lessons = [
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `early-${index}`,
        lessonDate: new Date('2026-08-01T00:00:00+08:00'),
      })),
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `late-${index}`,
        lessonDate: new Date('2026-08-08T00:00:00+08:00'),
      })),
    ]

    const selected = selectReplacementTeachingDay(lessons, 8)

    expect(selected?.date).toEqual(new Date('2026-08-08T00:00:00+08:00'))
    expect(selected?.lessonIds).toHaveLength(8)
  })

  it('does not replace a partial teaching day', () => {
    const selected = selectReplacementTeachingDay(
      Array.from({ length: 7 }, (_, index) => ({
        id: `lesson-${index}`,
        lessonDate: new Date('2026-08-08T00:00:00+08:00'),
      })),
      8,
    )

    expect(selected).toBeNull()
  })
})
