export type TeacherSubjectAssignment = {
  id?: string
  teacherId: string
  subject: string | null
}

export function effectiveTeacherAssignmentSubject(assignmentSubject: string | null, defaultSubject: string | null) {
  return assignmentSubject ?? defaultSubject
}

/**
 * Match an assignment to a lesson subject while treating legacy null subjects
 * as the group's default course subject. Prefer an explicit subject row when
 * both an explicit and a legacy row describe the same assignment.
 */
export function findTeacherAssignmentForSubject<T extends TeacherSubjectAssignment>(
  assignments: T[],
  subject: string | null,
  defaultSubject: string | null,
  preferredTeacherId?: string | null,
) {
  const effectiveSubject = subject ?? defaultSubject
  const matches = assignments.filter((assignment) =>
    effectiveTeacherAssignmentSubject(assignment.subject, defaultSubject) === effectiveSubject,
  )
  const exactMatches = matches.filter((assignment) => assignment.subject === subject)
  const preferredMatches = (exactMatches.length ? exactMatches : matches).filter((assignment) =>
    !preferredTeacherId || assignment.teacherId === preferredTeacherId,
  )
  const candidates = preferredMatches.length ? preferredMatches : exactMatches.length ? exactMatches : matches
  return candidates.length === 1 ? candidates[0] : null
}
