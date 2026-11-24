export const PRACTICE_CHECKIN_OPTIONS = [
  { value: 'CAN_EXPLAIN', label: '能独立讲清' },
  { value: 'NEEDS_HINT', label: '提示后能完成' },
  { value: 'NOT_PRACTICED', label: '还没来得及练' },
  { value: 'ASK_TEACHER', label: '想请老师再讲' },
] as const

export const FOLLOWUP_OUTCOME_OPTIONS = [
  { value: 'MASTERED', label: '已达成本次目标' },
  { value: 'CONTINUE', label: '继续巩固' },
  { value: 'NEW_DIFFICULTY', label: '发现新卡点' },
] as const

export type PracticeCheckinStatus = typeof PRACTICE_CHECKIN_OPTIONS[number]['value']
export type FollowupOutcome = typeof FOLLOWUP_OUTCOME_OPTIONS[number]['value']

export type ParentPracticeCheckin = {
  status: PracticeCheckinStatus
  note: string
  updatedAt: string | null
}

export type PreviousFeedbackFollowup = {
  feedbackId: string
  groupId: string
  subject: string
  studentId: string
  date: string | null
  topic: string
  focus: string
  practiceCheckin: ParentPracticeCheckin | null
}

export type StudentFollowupReview = {
  previousFeedbackId: string
  previousDate: string | null
  previousTopic: string
  previousFocus: string
  outcome: FollowupOutcome
  parentPracticeStatus: PracticeCheckinStatus | null
  parentPracticeNote: string
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizePracticeCheckin(value: unknown): ParentPracticeCheckin | null {
  if (!isRecord(value)) return null
  const status = PRACTICE_CHECKIN_OPTIONS.find((option) => option.value === value.status)?.value
  if (!status) return null
  return {
    status,
    note: typeof value.note === 'string' ? value.note.trim().slice(0, 240) : '',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
  }
}

export function normalizeFollowupReview(value: unknown): StudentFollowupReview | null {
  if (!isRecord(value)) return null
  const outcome = FOLLOWUP_OUTCOME_OPTIONS.find((option) => option.value === value.outcome)?.value
  if (!outcome) return null
  const parentPracticeStatus = PRACTICE_CHECKIN_OPTIONS.find((option) => option.value === value.parentPracticeStatus)?.value ?? null
  return {
    previousFeedbackId: typeof value.previousFeedbackId === 'string' ? value.previousFeedbackId.slice(0, 80) : '',
    previousDate: typeof value.previousDate === 'string' ? value.previousDate.slice(0, 40) : null,
    previousTopic: typeof value.previousTopic === 'string' ? value.previousTopic.trim().slice(0, 120) : '',
    previousFocus: typeof value.previousFocus === 'string' ? value.previousFocus.trim().slice(0, 240) : '',
    outcome,
    parentPracticeStatus,
    parentPracticeNote: typeof value.parentPracticeNote === 'string' ? value.parentPracticeNote.trim().slice(0, 240) : '',
  }
}

export function getStudentFeedbackRating(value: unknown, studentId: string, feedbackStudentIds: string[] = []): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const row = value.find((item) => isRecord(item) && item.studentId === studentId)
    return isRecord(row) ? row : null
  }
  if (!isRecord(value)) return null
  if (typeof value.studentId === 'string') return value.studentId === studentId ? value : null
  if (isRecord(value[studentId])) return value[studentId] as Record<string, unknown>
  if (feedbackStudentIds.length === 1 && feedbackStudentIds[0] === studentId) return value
  return null
}

export function mergeStudentFeedbackRating(
  value: unknown,
  studentId: string,
  feedbackStudentIds: string[],
  fields: Record<string, unknown>,
) {
  if (Array.isArray(value)) {
    let found = false
    const rows = value.map((item) => {
      if (!isRecord(item) || item.studentId !== studentId) return item
      found = true
      return { ...item, ...fields, studentId }
    })
    return found ? rows : [...rows, { studentId, ...fields }]
  }

  if (!isRecord(value)) return [{ studentId, ...fields }]
  if (typeof value.studentId === 'string') {
    return value.studentId === studentId ? { ...value, ...fields } : [value, { studentId, ...fields }]
  }
  if (isRecord(value[studentId])) {
    return { ...value, [studentId]: { ...value[studentId] as Record<string, unknown>, ...fields, studentId } }
  }
  if (feedbackStudentIds.length === 1 && feedbackStudentIds[0] === studentId) {
    return { ...value, ...fields, studentId }
  }
  return { ...value, [studentId]: { ...fields, studentId } }
}

export function createFollowupReview(previous: PreviousFeedbackFollowup, outcome: FollowupOutcome): StudentFollowupReview {
  return {
    previousFeedbackId: previous.feedbackId,
    previousDate: previous.date,
    previousTopic: previous.topic,
    previousFocus: previous.focus,
    outcome,
    parentPracticeStatus: previous.practiceCheckin?.status ?? null,
    parentPracticeNote: previous.practiceCheckin?.note ?? '',
  }
}
