import { describe, expect, it } from 'vitest'
import {
  normalizeAttendanceRecordStatus,
  resolveAttendanceSubmissionStatus,
  toAttendanceDisplayStatus,
} from '@/lib/attendance-status'

describe('two-state attendance editor', () => {
  it('normalizes legacy late status as present', () => {
    expect(normalizeAttendanceRecordStatus('late')).toBe('PRESENT')
  })

  it('projects historical four-state values without changing their meaning', () => {
    expect(toAttendanceDisplayStatus('ABSENT')).toBe('LEAVE')
    expect(toAttendanceDisplayStatus('MAKEUP')).toBe('PRESENT')
  })

  it('preserves untouched historical values on submission', () => {
    expect(resolveAttendanceSubmissionStatus({
      displayedStatus: 'LEAVE',
      originalStatus: 'ABSENT',
      changed: false,
    })).toBe('ABSENT')
    expect(resolveAttendanceSubmissionStatus({
      displayedStatus: 'PRESENT',
      originalStatus: 'MAKEUP',
      changed: false,
    })).toBe('MAKEUP')
  })

  it('uses the visible two-state choice after an explicit edit', () => {
    expect(resolveAttendanceSubmissionStatus({
      displayedStatus: 'PRESENT',
      originalStatus: 'ABSENT',
      changed: true,
    })).toBe('PRESENT')
  })
})
