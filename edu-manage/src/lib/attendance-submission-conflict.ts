export type AttendanceSubmissionConflict = {
  status: 409
  body: { code: 'ENROLLMENT_BALANCE_CONFLICT' | 'LESSON_TERM_REQUIRED'; error: string }
}

export function getAttendanceSubmissionConflict(error: unknown): AttendanceSubmissionConflict | null {
  if (!(error instanceof Error)) return null
  if (error.message === 'ENROLLMENT_BALANCE_CONFLICT') {
    return {
      status: 409,
      body: {
        code: 'ENROLLMENT_BALANCE_CONFLICT',
        error: '学员课时余额刚刚发生变化，本次考勤未提交。请刷新并核对余额后重试',
      },
    }
  }
  if (error.message === 'LESSON_TERM_REQUIRED') {
    return {
      status: 409,
      body: {
        code: 'LESSON_TERM_REQUIRED',
        error: '该课程未关联教学批次，本次考勤未保存。请联系管理员补齐批次后重试',
      },
    }
  }
  return null
}
