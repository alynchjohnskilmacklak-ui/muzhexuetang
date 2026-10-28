export type StudentNameReference = { id: string; name: string }

/**
 * Pull student-specific statements out of a lesson note so they can be attached
 * to that student's observation without being repeated as shared lesson content.
 * A fragment is assigned only when exactly one roster student is mentioned.
 */
export function splitStudentObservationFragments(
  lessonNote: string,
  students: StudentNameReference[],
) {
  const rosterNames = students
    .filter((student) => student.name.trim().length >= 2)
    .map((student) => ({ id: student.id, name: student.name.trim() }))
  const rosterNamesByLength = [...rosterNames].sort((a, b) => b.name.length - a.name.length)
  const observationFragments = new Map<string, string[]>()
  const sharedLessonFragments: string[] = []
  const fragments = lessonNote.split(/[。！？!?\n，,、；;]+/).map((item) => item.trim()).filter(Boolean)

  for (const fragment of fragments) {
    const mentionedStudentIds = new Set<string>()
    for (let index = 0; index < fragment.length;) {
      const matches = rosterNamesByLength.filter((student) => fragment.startsWith(student.name, index))
      if (!matches.length) {
        index += 1
        continue
      }
      const longestName = matches[0].name.length
      matches.filter((student) => student.name.length === longestName).forEach((student) => mentionedStudentIds.add(student.id))
      index += longestName
    }

    if (mentionedStudentIds.size === 1) {
      const [studentId] = mentionedStudentIds
      const rows = observationFragments.get(studentId) || []
      if (!rows.includes(fragment)) rows.push(fragment)
      observationFragments.set(studentId, rows)
    } else if (mentionedStudentIds.size > 1) {
      // A fragment mentioning multiple students is ambiguous, so do not assign it as an individual fact.
      continue
    } else {
      sharedLessonFragments.push(fragment)
    }
  }

  return {
    sharedLessonNote: sharedLessonFragments.join('。'),
    observationFragments,
  }
}
