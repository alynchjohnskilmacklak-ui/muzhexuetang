import { describe, expect, it } from 'vitest'
import {
  type IntensiveHistoryRecordInput,
  validateIntensiveHistoryInput,
} from '@/lib/intensive-history'

const now = new Date('2026-07-26T12:00:00.000Z')

function validInput(overrides: Partial<IntensiveHistoryRecordInput> = {}): IntensiveHistoryRecordInput {
  return {
    groupId: 'group-1',
    teacherId: 'teacher-1',
    lessonDate: '2026-07-25',
    startTime: '17:30',
    endTime: '19:30',
    actualMinutes: 90,
    reason: '根据系统上线前纸质考勤表补录',
    records: [{ studentId: 'student-1', status: 'PRESENT' }],
    ...overrides,
  }
}

describe('intensive history input validation', () => {
  it('accepts a completed historical lesson', () => {
    expect(validateIntensiveHistoryInput(validInput(), now)).toBeNull()
  })

  it('rejects future lessons and a lesson that has not started today', () => {
    expect(validateIntensiveHistoryInput(validInput({
      lessonDate: '2026-07-27',
    }), now)).toContain('未来日期')

    expect(validateIntensiveHistoryInput(validInput({
      lessonDate: '2026-07-26',
      startTime: '21:00',
      endTime: '22:00',
    }), now)).toContain('已经开始')
  })

  it('requires valid actual minutes and an auditable reason', () => {
    expect(validateIntensiveHistoryInput(validInput({ actualMinutes: 0 }), now)).toContain('实际授课分钟')
    expect(validateIntensiveHistoryInput(validInput({ actualMinutes: 601 }), now)).toContain('实际授课分钟')
    expect(validateIntensiveHistoryInput(validInput({ reason: '补录' }), now)).toContain('至少4个字')
  })

  it('rejects duplicate students and invalid attendance statuses', () => {
    expect(validateIntensiveHistoryInput(validInput({
      records: [
        { studentId: 'student-1', status: 'PRESENT' },
        { studentId: 'student-1', status: 'LEAVE' },
      ],
    }), now)).toContain('不能重复')

    expect(validateIntensiveHistoryInput(validInput({
      records: [{ studentId: 'student-1', status: 'INVALID' as 'PRESENT' }],
    }), now)).toContain('状态不正确')
  })
})
