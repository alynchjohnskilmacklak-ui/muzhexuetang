import { minutesToHours } from '@/lib/hours'

export const INTENSIVE_MODE = 'INTENSIVE' as const
export const NORMAL_MODE = 'NORMAL' as const
export const INTENSIVE_FEEDBACK_RATE = 1

export type IntensiveTeachingType = 'ONE_ON_ONE' | 'ONE_ON_TWO' | 'ONE_ON_THREE'

const TEACHING_TYPE_SIZE: Record<IntensiveTeachingType, number> = {
  ONE_ON_ONE: 1,
  ONE_ON_TWO: 2,
  ONE_ON_THREE: 3,
}

export function toIntensiveTeachingType(value: unknown): IntensiveTeachingType | null {
  return value === 'ONE_ON_ONE' || value === 'ONE_ON_TWO' || value === 'ONE_ON_THREE'
    ? value
    : null
}

export function intensiveStudentCountError(type: IntensiveTeachingType, studentCount: number) {
  const expected = TEACHING_TYPE_SIZE[type]
  return studentCount === expected ? null : `${type} requires exactly ${expected} student(s)`
}

export function resolveIntensiveActualMinutes(
  plannedMinutes: number | null | undefined,
  submittedMinutes: Array<number | null | undefined>,
) {
  const values = [...new Set(submittedMinutes.map(Number).filter((value) => Number.isFinite(value) && value > 0))]
  if (values.length > 1) throw new Error('INTENSIVE_ACTUAL_MINUTES_MISMATCH')
  const resolved = values[0] || Number(plannedMinutes || 0)
  if (resolved <= 0) throw new Error('INTENSIVE_ACTUAL_MINUTES_REQUIRED')
  return Math.round(resolved)
}

export function calculateIntensiveDeductHours(status: string, actualMinutes: number) {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'LEAVE' || normalized === 'MAKEUP' || normalized === 'CANCELLED') return 0
  if (normalized !== 'PRESENT' && normalized !== 'ABSENT') return 0
  return minutesToHours(actualMinutes)
}

export function shouldGenerateIntensiveLessonPay(statuses: string[], actualMinutes: number | null | undefined) {
  return Number(actualMinutes || 0) > 0 && statuses.some((status) => String(status).toUpperCase() === 'PRESENT')
}

export function intensiveTeachingTypeLabel(value: string | null | undefined) {
  if (value === 'ONE_ON_TWO') return '一对二'
  if (value === 'ONE_ON_THREE') return '一对三'
  return '一对一'
}

export function intensiveFeedbackRewardAmount(studentCount: number) {
  return Number((Math.max(0, studentCount) * INTENSIVE_FEEDBACK_RATE).toFixed(4))
}

export function createLessonStudentSnapshot(studentIds: string[]) {
  return [...new Set(studentIds.filter(Boolean))]
}
