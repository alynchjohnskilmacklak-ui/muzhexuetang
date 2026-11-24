import type { CourseType } from '@prisma/client'
import { minutesToHours } from '@/lib/hours'
import { calculateIntensiveDeductHours } from '@/lib/intensive-class'

export function isSmallClassCourse(courseType?: CourseType | string | null) {
  return courseType !== 'ONE_ON_ONE'
}

/** 计费模式：MONTHLY = 按月计费（暑假班，无论来不来都算课时）；PER_HOUR = 按课时计费（周末课，没来不扣）。 */
export type AttendanceBillingMode = 'MONTHLY' | 'PER_HOUR'

/** 学期 kind → 计费模式：周末班按课时；寒暑假及其他批次按月。 */
export function termKindToBillingMode(kind?: string | null): AttendanceBillingMode {
  return kind === 'WEEKEND' ? 'PER_HOUR' : 'MONTHLY'
}

export function shouldDeductAttendanceHours(status: string, billingMode: AttendanceBillingMode = 'MONTHLY') {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'PRESENT') return true
  // 按课时收费的周末课：学生没来（ABSENT）不扣课时；按月计费班（暑假班等）无论来不来都算课时
  if (normalized === 'ABSENT') return billingMode === 'MONTHLY'
  // Holiday/monthly batches charge approved leave. Weekend/hourly batches
  // refund the lesson because families pay only for lessons they attend.
  if (normalized === 'LEAVE') return billingMode === 'MONTHLY'

  return false
}

export function shouldCreateMakeupRequest(params: {
  status: string
  courseType?: CourseType | string | null
  intensiveMode?: string | null
}) {
  const normalized = String(params.status || '').toUpperCase()
  if (normalized !== 'LEAVE' && normalized !== 'ABSENT') return false

  return params.courseType === 'ONE_ON_ONE' || params.intensiveMode === 'INTENSIVE'
}

export function calculateAttendanceDeductHours(params: {
  status: string
  courseType?: CourseType | string | null
  lessonMinutes: number
  actualMinutes?: number | null
  intensiveMode?: string | null
  billingMode?: AttendanceBillingMode
}) {
  const { status, courseType, lessonMinutes, actualMinutes, intensiveMode, billingMode } = params
  if (!shouldDeductAttendanceHours(status, billingMode)) return 0

  if (intensiveMode === 'INTENSIVE') {
    if (String(status || '').toUpperCase() === 'LEAVE') {
      return minutesToHours(Number(actualMinutes) || lessonMinutes)
    }
    return calculateIntensiveDeductHours(status, Number(actualMinutes) || lessonMinutes)
  }

  if (courseType === 'ONE_ON_ONE') {
    return minutesToHours(Number(actualMinutes) || lessonMinutes)
  }

  return minutesToHours(lessonMinutes)
}
