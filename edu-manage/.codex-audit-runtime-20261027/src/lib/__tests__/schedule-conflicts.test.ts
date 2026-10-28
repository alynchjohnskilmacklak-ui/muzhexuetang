import { describe, expect, it } from 'vitest'
import { findScheduleMoveConflicts, timeRangesOverlap } from '../schedule-conflicts'

describe('schedule move conflicts', () => {
  it('treats adjacent lessons as non-overlapping', () => {
    expect(timeRangesOverlap('09:00', '09:40', '09:40', '10:20')).toBe(false)
  })

  it('returns teacher and room overlaps', () => {
    expect(findScheduleMoveConflicts('09:00', '09:40', [
      { id: 'teacher', startTime: '09:20', endTime: '10:00', teacherConflict: true },
      { id: 'free', startTime: '09:20', endTime: '10:00' },
    ]).map((item) => item.id)).toEqual(['teacher'])
  })
})
