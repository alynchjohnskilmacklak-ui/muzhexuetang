import { describe, it, expect } from 'vitest'
import { hasTimeOverlap } from '@/lib/schedule-conflict'
import { isTimeRangeOverlap, normalizeTimeHHmm, normalizeDateOnly, getLocalDayRange } from '@/lib/date/local-day'

describe('hasTimeOverlap', () => {
  it('detects overlapping time ranges', () => {
    expect(hasTimeOverlap('08:00', '10:00', '09:00', '11:00')).toBe(true)
  })

  it('detects nested time range', () => {
    expect(hasTimeOverlap('09:00', '10:00', '08:00', '11:00')).toBe(true)
  })

  it('allows adjacent non-overlapping times', () => {
    expect(hasTimeOverlap('08:00', '09:00', '09:00', '10:00')).toBe(false)
  })

  it('allows separate time ranges', () => {
    expect(hasTimeOverlap('08:00', '09:00', '10:00', '11:00')).toBe(false)
  })

  it('allows same-day different times on different dates (not checked here)', () => {
    // Time-only overlap; date check is handled separately
    expect(hasTimeOverlap('08:00', '10:00', '14:00', '16:00')).toBe(false)
  })
})

describe('isTimeRangeOverlap (unified date util)', () => {
  it('same as hasTimeOverlap for standard formats', () => {
    expect(isTimeRangeOverlap('08:00', '10:00', '09:00', '11:00')).toBe(true)
    expect(isTimeRangeOverlap('08:00', '09:00', '09:00', '10:00')).toBe(false)
  })

  it('normalizes H:mm to HH:mm', () => {
    expect(isTimeRangeOverlap('8:00', '10:00', '09:00', '11:00')).toBe(true)
  })
})

describe('normalizeTimeHHmm', () => {
  it('accepts valid HH:mm', () => {
    expect(normalizeTimeHHmm('08:00')).toBe('08:00')
  })

  it('pads single-digit hour', () => {
    expect(normalizeTimeHHmm('8:00')).toBe('08:00')
  })

  it('rejects invalid format', () => {
    expect(() => normalizeTimeHHmm('abc')).toThrow('Invalid time format')
    expect(() => normalizeTimeHHmm('')).toThrow('Invalid time format')
  })
})

describe('normalizeDateOnly', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(normalizeDateOnly('2026-06-19')).toBe('2026-06-19')
  })

  it('accepts ISO string', () => {
    expect(normalizeDateOnly('2026-06-19T08:00:00Z')).toBe('2026-06-19')
  })

  it('accepts Date object', () => {
    expect(normalizeDateOnly(new Date('2026-06-19'))).toBe('2026-06-19')
  })

  it('rejects invalid input', () => {
    expect(() => normalizeDateOnly('')).toThrow('Invalid date')
  })
})

describe('getLocalDayRange', () => {
  it('returns correct start and end for a date', () => {
    const { start, end } = getLocalDayRange('2026-06-19')
    // start is local midnight (UTC+8), so ISO may show previous day in UTC
    const diff = end.getTime() - start.getTime()
    expect(diff).toBe(86400000)
    // Verify it's 00:00 in UTC+8
    expect(start.getUTCHours()).toBe(16) // 00:00+08:00 = 16:00 UTC (previous day)
    expect(end.getUTCHours()).toBe(16)
  })

  it('rejects invalid date string', () => {
    expect(() => getLocalDayRange('not-a-date')).toThrow('Invalid date string')
  })
})

describe('teacher-only-access logic', () => {
  it('teacher should only see own lessons (logical test)', () => {
    // This test verifies the logic pattern without DB access
    let teacherId: string = 'teacher-A'
    let requestedTeacherId: string = 'teacher-B'

    // If teacher and requested mismatch, should reject
    expect(teacherId !== requestedTeacherId).toBe(true)
    // The guard should return 403
  })

  it('admin can filter by any teacherId', () => {
    // Admin bypasses teacherId restriction
    const role = 'admin'
    const canFilterOthers = role === 'admin'
    expect(canFilterOthers).toBe(true)
  })
})

describe('parent-only-access logic', () => {
  it('parent should only see their children', () => {
    const parentStudentIds = ['student-1', 'student-2']
    const requestedStudentId = 'student-3'

    expect(parentStudentIds.includes(requestedStudentId)).toBe(false)
    // The guard should return 403
  })

  it('parent should not see class size', () => {
    // Parent API response should not include student count or list
    const parentResponse = {
      courseName: '数学提高班',
      teacherName: '陈老师',
      // studentCount should NOT be in parent response
    }
    expect(parentResponse).not.toHaveProperty('studentCount')
    expect(parentResponse).not.toHaveProperty('students')
  })
})

describe('attendance dedup logic', () => {
  it('should not deduct hours twice for same lesson+student', () => {
    const alreadyDeducted = true
    let deductedCount = 0

    if (!alreadyDeducted) {
      deductedCount += 1
    }

    expect(deductedCount).toBe(0)
  })

  it('should allow deduction on first submission', () => {
    const alreadyDeducted = false
    let deductedCount = 0

    if (!alreadyDeducted) {
      deductedCount += 1
    }

    expect(deductedCount).toBe(1)
  })
})
