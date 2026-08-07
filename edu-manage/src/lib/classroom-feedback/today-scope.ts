export type TodayFeedbackScopeSource = {
  studentIds: string[]
  feedbackGroupId?: string | null
  classLesson?: { groupId?: string | null } | null
}

export function feedbackTodayScopeKey(groupId: string, studentId: string) {
  return `${groupId}:${studentId}`
}

export function buildTodayFeedbackScopeSet(feedbacks: TodayFeedbackScopeSource[]) {
  const scopes = new Set<string>()
  for (const feedback of feedbacks) {
    const groupId = feedback.feedbackGroupId || feedback.classLesson?.groupId
    if (!groupId) continue
    for (const studentId of feedback.studentIds) {
      scopes.add(feedbackTodayScopeKey(groupId, studentId))
    }
  }
  return scopes
}
