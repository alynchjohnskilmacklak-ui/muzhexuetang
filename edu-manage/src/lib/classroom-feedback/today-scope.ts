export type TodayFeedbackScopeSource = {
  studentIds: string[]
  feedbackGroupId?: string | null
  classLesson?: {
    groupId?: string | null
    subject?: string | null
    group?: { course?: { subject?: string | null } | null } | null
  } | null
}

export function feedbackTodayScopeKey(groupId: string, subject: string | null | undefined, studentId: string) {
  return `${groupId}::${encodeURIComponent(subject?.trim() || '未填学科')}::${studentId}`
}

export function buildTodayFeedbackScopeSet(feedbacks: TodayFeedbackScopeSource[]) {
  const scopes = new Set<string>()
  for (const feedback of feedbacks) {
    const groupId = feedback.feedbackGroupId || feedback.classLesson?.groupId
    if (!groupId) continue
    const subject = feedback.classLesson?.subject || feedback.classLesson?.group?.course?.subject
    for (const studentId of feedback.studentIds) {
      scopes.add(feedbackTodayScopeKey(groupId, subject, studentId))
    }
  }
  return scopes
}
