import type { CourseType } from '@prisma/client'
import { minutesToHours } from '@/lib/hours'

export function isSmallClassCourse(courseType?: CourseType | string | null) {
  return courseType !== 'ONE_ON_ONE'
}

export function shouldDeductAttendanceHours(status: string, courseType?: CourseType | string | null) {
  const normalized = String(status || '').toUpperCase()
  const isSmallClass = isSmallClassCourse(courseType)

  if (normalized === 'PRESENT') return true
  if (normalized === 'ABSENT') return true
  // LEAVE always deducts — for one-on-one, a makeup request gives a free session later
  if (normalized === 'LEAVE') return true

  return false
}

export function calculateAttendanceDeductHours(params: {
  status: string
  courseType?: CourseType | string | null
  lessonMinutes: number
  actualMinutes?: number | null
}) {
  const { status, courseType, lessonMinutes, actualMinutes } = params

  if (!shouldDeductAttendanceHours(status, courseType)) return 0

  if (courseType === 'ONE_ON_ONE') {
    return minutesToHours(Number(actualMinutes) || lessonMinutes)
  }

  return minutesToHours(lessonMinutes)
}
