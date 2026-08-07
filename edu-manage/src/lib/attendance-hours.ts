import type { CourseType } from '@prisma/client'
import { minutesToHours } from '@/lib/hours'
import { calculateIntensiveDeductHours } from '@/lib/intensive-class'

export function isSmallClassCourse(courseType?: CourseType | string | null) {
  return courseType !== 'ONE_ON_ONE'
}

export function shouldDeductAttendanceHours(status: string) {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'PRESENT') return true
  if (normalized === 'ABSENT') return true
  // LEAVE always deducts — for one-on-one, a makeup request gives a free session later
  if (normalized === 'LEAVE') return true

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
}) {
  const { status, courseType, lessonMinutes, actualMinutes, intensiveMode } = params

  if (intensiveMode === 'INTENSIVE') {
    return calculateIntensiveDeductHours(status, Number(actualMinutes) || lessonMinutes)
  }

  if (!shouldDeductAttendanceHours(status)) return 0

  if (courseType === 'ONE_ON_ONE') {
    return minutesToHours(Number(actualMinutes) || lessonMinutes)
  }

  return minutesToHours(lessonMinutes)
}
