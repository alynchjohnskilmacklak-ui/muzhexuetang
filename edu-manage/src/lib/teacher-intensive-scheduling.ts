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
