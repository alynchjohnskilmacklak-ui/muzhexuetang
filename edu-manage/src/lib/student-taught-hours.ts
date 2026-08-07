import { calculateIntensiveDeductHours } from '@/lib/intensive-class'
import { roundHours } from '@/lib/hours'

export type TaughtHoursEnrollment = {
  usedHours?: number | null
  group?: {
    intensiveMode?: string | null
  } | null
}

export type ApprovedIntensiveAttendance = {
  status?: string | null
  actualMinutes?: number | null
  lesson?: {
    actualMinutes?: number | null
  } | null
}

export function calculateApprovedIntensiveHours(attendances: ApprovedIntensiveAttendance[]) {
  return roundHours(attendances.reduce((sum, attendance) => (
    sum + calculateIntensiveDeductHours(
      String(attendance.status || ''),
      Number(attendance.actualMinutes || attendance.lesson?.actualMinutes || 0),
    )
  ), 0))
}

export function calculateTaughtHours(
  enrollments: TaughtHoursEnrollment[],
  approvedIntensiveHours = 0,
) {
  const prepaidHours = enrollments
    .filter((enrollment) => enrollment.group?.intensiveMode !== 'INTENSIVE')
    .reduce((sum, enrollment) => sum + Number(enrollment.usedHours || 0), 0)

  return roundHours(prepaidHours + Math.max(0, Number(approvedIntensiveHours) || 0))
}
