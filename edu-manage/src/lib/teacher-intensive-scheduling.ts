import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'

export const TEACHER_INTENSIVE_MAX_ADVANCE_DAYS = 60
export const TEACHER_INTENSIVE_MAX_BACKFILL_DAYS = 365
export const TEACHER_INTENSIVE_EDIT_LOCK_MINUTES = 30

const EXPECTED_STUDENT_COUNT = {
  ONE_ON_ONE: 1,
  ONE_ON_TWO: 2,
  ONE_ON_THREE: 3,
} as const

export type TeacherIntensiveTeachingType = keyof typeof EXPECTED_STUDENT_COUNT

export function getTeacherIntensiveStudentCount(type: TeacherIntensiveTeachingType) {
  return EXPECTED_STUDENT_COUNT[type]
}

export function parseTeacherIntensiveTeachingType(value: unknown): TeacherIntensiveTeachingType | null {
  return value === 'ONE_ON_ONE' || value === 'ONE_ON_TWO' || value === 'ONE_ON_THREE'
    ? value
    : null
}

export function timeToMinutes(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

export function calculatePlannedMinutes(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (start == null || end == null || end <= start) return null
  return end - start
}

export function validateTeacherIntensiveSchedule(input: {
  lessonDate: string
  startTime: string
  endTime: string
  teachingType: TeacherIntensiveTeachingType
  studentIds: string[]
  now?: Date
}) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.lessonDate) ? input.lessonDate : ''
  if (!date) return '上课日期格式不正确'

  const plannedMinutes = calculatePlannedMinutes(input.startTime, input.endTime)
  if (plannedMinutes == null) return '结束时间必须晚于开始时间'
  if (plannedMinutes < 30 || plannedMinutes > 600) return '单次课程时长需在30至600分钟之间'

  const expectedStudents = getTeacherIntensiveStudentCount(input.teachingType)
  const uniqueStudentIds = [...new Set(input.studentIds.filter(Boolean))]
  if (uniqueStudentIds.length !== expectedStudents) {
    return `${intensiveTeachingTypeLabel(input.teachingType)}必须选择${expectedStudents}名学生`
  }

  const today = localDateKey(input.now || new Date())
  const minDate = new Date(getLocalDayRange(today).start)
  minDate.setUTCDate(minDate.getUTCDate() - TEACHER_INTENSIVE_MAX_BACKFILL_DAYS)
  if (date < localDateKey(minDate)) {
    return `教师最多可补录过去${TEACHER_INTENSIVE_MAX_BACKFILL_DAYS}天的课程`
  }

  const maxDate = new Date(getLocalDayRange(today).start)
  maxDate.setUTCDate(maxDate.getUTCDate() + TEACHER_INTENSIVE_MAX_ADVANCE_DAYS)
  if (date > localDateKey(maxDate)) return `最多可提前${TEACHER_INTENSIVE_MAX_ADVANCE_DAYS}天约课`

  return null
}

export function lessonStartAt(lessonDate: string | Date, startTime: string) {
  const date = typeof lessonDate === 'string'
    ? lessonDate.slice(0, 10)
    : localDateKey(lessonDate)
  return new Date(`${date}T${startTime}:00+08:00`)
}

export const TEACHER_ATTENDANCE_EARLY_WINDOW_MINUTES = 30
export const TEACHER_ATTENDANCE_CUTOFF_HOUR = 18

export function teacherAttendanceCutoffAt(lessonDate: string | Date) {
  const date = typeof lessonDate === 'string'
    ? lessonDate.slice(0, 10)
    : localDateKey(lessonDate)
  return new Date(`${date}T${String(TEACHER_ATTENDANCE_CUTOFF_HOUR).padStart(2, '0')}:00:00+08:00`)
}

/** Regular attendance opens 30 minutes before class; intensive attendance opens at class start. */
export function teacherAttendanceOpenAt(input: {
  lessonDate: string | Date
  startTime: string
  intensiveMode?: string | null
}) {
  const startsAt = lessonStartAt(input.lessonDate, input.startTime)
  if (input.intensiveMode === 'INTENSIVE') return startsAt
  return new Date(startsAt.getTime() - TEACHER_ATTENDANCE_EARLY_WINDOW_MINUTES * 60_000)
}

export function canSubmitTeacherAttendance(input: {
  lessonDate: string | Date
  startTime: string
  intensiveMode?: string | null
  now?: Date
}) {
  const now = input.now || new Date()
  return now.getTime() >= teacherAttendanceOpenAt(input).getTime()
    && now.getTime() < teacherAttendanceCutoffAt(input.lessonDate).getTime()
}

export type TeacherAttendanceSubmissionState = 'UPCOMING' | 'OPEN' | 'CLOSED' | 'INVALID'

/**
 * Teacher attendance is writable from the configured opening time through
 * 18:00 China local time on the lesson date. Administrators use separate routes
 * for later backfills and corrections.
 */
export function getTeacherAttendanceSubmissionState(input: {
  lessonDate: string | Date
  startTime: string
  endTime: string
  intensiveMode?: string | null
  allowRejectedIntensiveResubmission?: boolean
  now?: Date
}): TeacherAttendanceSubmissionState {
  let dateKey: string
  try {
    dateKey = typeof input.lessonDate === 'string'
      ? input.lessonDate.slice(0, 10)
      : localDateKey(input.lessonDate)
  } catch {
    return 'INVALID'
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)
    || timeToMinutes(input.startTime) === null
    || timeToMinutes(input.endTime) === null) return 'INVALID'

  const startsAt = lessonStartAt(dateKey, input.startTime)
  const endsAt = lessonStartAt(dateKey, input.endTime)
  const cutoffAt = teacherAttendanceCutoffAt(dateKey)
  const now = input.now || new Date()
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())
    || endsAt.getTime() <= startsAt.getTime() || !Number.isFinite(cutoffAt.getTime())
    || !Number.isFinite(now.getTime())) return 'INVALID'

  if (now.getTime() >= cutoffAt.getTime()) return 'CLOSED'
  if (input.allowRejectedIntensiveResubmission && input.intensiveMode === 'INTENSIVE') return 'OPEN'
  if (now.getTime() < teacherAttendanceOpenAt(input).getTime()) return 'UPCOMING'
  return 'OPEN'
}

/** Meal additions are available to a teacher only while teaching today's class. */
export function canAppendTeacherMealAttendance(input: {
  lessonDate: string | Date
  startTime: string
  endTime: string
  now?: Date
}) {
  const now = input.now || new Date()
  let dateKey: string
  try {
    dateKey = typeof input.lessonDate === 'string'
      ? input.lessonDate.slice(0, 10)
      : localDateKey(input.lessonDate)
    if (dateKey !== localDateKey(now)) return false
  } catch {
    return false
  }
  if (timeToMinutes(input.startTime) === null || timeToMinutes(input.endTime) === null) return false
  const startAt = lessonStartAt(dateKey, input.startTime).getTime()
  const endAt = lessonStartAt(dateKey, input.endTime).getTime()
  const nowAt = now.getTime()
  return Number.isFinite(startAt)
    && Number.isFinite(endAt)
    && Number.isFinite(nowAt)
    && endAt > startAt
    && nowAt >= startAt
    && nowAt < endAt
}

export function canTeacherEditIntensiveLesson(input: {
  lessonDate: string | Date
  startTime: string
  status: string
  settlementStatus: string
  intensiveReviewStatus?: string
  attendanceSubmittedAt?: string | Date | null
  now?: Date
}) {
  if (input.status !== 'SCHEDULED' || input.settlementStatus !== 'UNSETTLED') return false
  const now = input.now || new Date()
  const startsAt = lessonStartAt(input.lessonDate, input.startTime).getTime()
  if (startsAt <= now.getTime()) {
    return input.intensiveReviewStatus === 'DRAFT' && !input.attendanceSubmittedAt
  }
  const lockAt = lessonStartAt(input.lessonDate, input.startTime).getTime()
    - TEACHER_INTENSIVE_EDIT_LOCK_MINUTES * 60_000
  return now.getTime() < lockAt
}

export function canSubmitIntensiveAttendance(input: {
  lessonDate: string | Date
  startTime: string
  now?: Date
}) {
  return (input.now || new Date()).getTime() >= lessonStartAt(input.lessonDate, input.startTime).getTime()
}

export function intensiveTeachingTypeLabel(type: TeacherIntensiveTeachingType) {
  if (type === 'ONE_ON_TWO') return '一对二'
  if (type === 'ONE_ON_THREE') return '一对三'
  return '一对一'
}

export function splitIntensiveSubjects(value: string | null | undefined) {
  return [...new Set(
    String(value || '')
      .split(/[、,，/；;]+/)
      .map((subject) => subject.trim())
      .filter(Boolean),
  )]
}

export function resolveTeacherIntensiveSubjects(input: {
  teacherId: string
  groupTeacherId?: string | null
  assignmentSubjects: Array<string | null | undefined>
  hasAnyAssignments?: boolean
  courseSubject?: string | null
}) {
  const assigned = [...new Set(
    input.assignmentSubjects
      .flatMap((subject) => splitIntensiveSubjects(subject))
      .filter(Boolean),
  )]
  if (assigned.length) return assigned
  if (input.hasAnyAssignments) return []
  if (input.groupTeacherId !== input.teacherId) return []
  return splitIntensiveSubjects(input.courseSubject)
}
