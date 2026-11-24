import { describe, expect, it } from 'vitest'
import { getAttendanceSubmissionConflict } from './attendance-submission-conflict'

describe('getAttendanceSubmissionConflict', () => {
  it('returns a refreshable conflict for concurrent balance changes', () => {
    expect(getAttendanceSubmissionConflict(new Error('ENROLLMENT_BALANCE_CONFLICT'))).toEqual({
      status: 409,
      body: {
        code: 'ENROLLMENT_BALANCE_CONFLICT',
        error: '学员课时余额刚刚发生变化，本次考勤未提交。请刷新并核对余额后重试',
      },
    })
  })

  it('prevents attendance from silently generating a salary row without a term', () => {
    expect(getAttendanceSubmissionConflict(new Error('LESSON_TERM_REQUIRED'))).toMatchObject({
      status: 409,
      body: { code: 'LESSON_TERM_REQUIRED' },
    })
  })

  it('leaves unrelated errors to the API error handler', () => {
    expect(getAttendanceSubmissionConflict(new Error('DATABASE_UNAVAILABLE'))).toBeNull()
  })
})
