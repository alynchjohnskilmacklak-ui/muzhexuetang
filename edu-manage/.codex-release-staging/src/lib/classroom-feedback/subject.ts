type SubjectGroup = {
  course?: { subject?: string | null } | null
  teacherAssignments?: Array<{ teacherId?: string | null; subject?: string | null }> | null
}

type SubjectLesson = {
  subject?: string | null
  group?: SubjectGroup | null
} | null

/** Prefer the subject taught in this lesson; never guess from a teacher's profile. */
export function feedbackSubject(
  lesson: SubjectLesson | undefined,
  teacherId: string | null | undefined,
  feedbackGroup?: SubjectGroup | null,
  knowledgeCardSubject?: string | null,
): string {
  const lessonSubject = lesson?.subject?.trim()
  if (lessonSubject) return lessonSubject

  // 知识卡（AI 生成时带学科）仅作最后的兜底，权威性低于课程与任课安排
  const cardSubject = knowledgeCardSubject?.trim() || ''

  const group = lesson?.group || feedbackGroup
  const assignedSubjects = [...new Set((group?.teacherAssignments || [])
    .filter((assignment) => assignment.teacherId === teacherId)
    .map((assignment) => assignment.subject?.trim())
    .filter((subject): subject is string => Boolean(subject)))]
  if (assignedSubjects.length === 1) return assignedSubjects[0]
  if (assignedSubjects.length > 1) return cardSubject
  if (group?.teacherAssignments?.length) return cardSubject
  return group?.course?.subject?.trim() || cardSubject
}
