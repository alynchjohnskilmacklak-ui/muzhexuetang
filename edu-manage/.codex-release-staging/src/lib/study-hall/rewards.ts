export const STUDY_HALL_REWARD = {
  fullAttendance: 40,
  homeworkEntry: 0.5,
} as const

export const COMPLETED_ATTENDANCE_STATUSES = ['PRESENT', 'PERSONAL_LEAVE', 'ABSENT'] as const

/**
 * Product rule A1: completing the attendance action counts, including leave
 * and absence. Issued rewards are append-only and are not automatically
 * clawed back when a later edit changes the attendance state.
 */
export function studyHallAttendanceRewardKey(classId: string, studyDate: string) {
  return `STUDY_HALL_ATTENDANCE:${classId}:${studyDate}`
}

type AttendanceRewardClient = {
  teacherSalaryTransaction: {
    create(args: { data: {
      teacherId: string
      termId: string
      type: string
      amount: number
      lessonPayKey: string
      lessonDate: Date
      description: string
    } }): Promise<unknown>
  }
}

type HomeworkRewardClient = {
  teacherSalaryTransaction: {
    create(args: { data: {
      teacherId: string
      termId: string
      type: string
      amount: number
      feedbackId: string
      lessonDate: Date
      description: string
    } }): Promise<unknown>
  }
}

export function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
}

/** Direct insert + database unique key is the concurrency boundary. */
export async function createStudyHallAttendanceReward(
  client: AttendanceRewardClient,
  input: { teacherId: string; termId: string; classId: string; className: string; studyDate: string; lessonDate: Date },
) {
  const lessonPayKey = studyHallAttendanceRewardKey(input.classId, input.studyDate)
  try {
    await client.teacherSalaryTransaction.create({
      data: {
        teacherId: input.teacherId,
        termId: input.termId,
        type: 'STUDY_HALL_ATTENDANCE',
        amount: STUDY_HALL_REWARD.fullAttendance,
        lessonPayKey,
        lessonDate: input.lessonDate,
        description: `晚托作业班考勤奖励：${input.className} · ${input.studyDate}，全班完成考勤`,
      },
    })
    return true
  } catch (error) {
    if (isUniqueConstraintError(error)) return false
    throw error
  }
}

export async function createStudyHallHomeworkReward(
  client: HomeworkRewardClient,
  input: { teacherId: string; termId: string; entryId: string; className: string; studentName: string; lessonDate: Date },
) {
  try {
    await client.teacherSalaryTransaction.create({
      data: {
        teacherId: input.teacherId,
        termId: input.termId,
        type: 'STUDY_HALL_BONUS',
        amount: STUDY_HALL_REWARD.homeworkEntry,
        feedbackId: input.entryId,
        lessonDate: input.lessonDate,
        description: `作业班作业登记奖励：${input.className} · ${input.studentName}，0.50元/人`,
      },
    })
    return true
  } catch (error) {
    if (isUniqueConstraintError(error)) return false
    throw error
  }
}
