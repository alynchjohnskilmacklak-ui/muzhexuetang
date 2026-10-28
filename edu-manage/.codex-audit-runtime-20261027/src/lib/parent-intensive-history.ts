type ChildLesson = {
  lessonStudents?: Array<{ studentId: string }>
  attendances?: Array<{ studentId?: string }>
  classroomFeedbacks?: Array<{ studentIds?: string[]; imageUrls?: string[] }>
}

/** Scope both participation and nested personal data to one child's record IDs. */
export function scopeParentIntensiveHistory<T extends ChildLesson>(lessons: T[], recordIds: readonly string[]) {
  const ids = new Set(recordIds)
  return lessons.flatMap((lesson) => {
    const attendances = (lesson.attendances || []).filter((row) => row.studentId && ids.has(row.studentId))
    const classroomFeedbacks = (lesson.classroomFeedbacks || []).filter((row) => row.studentIds?.some((id) => ids.has(id)))
    const lessonStudents = (lesson.lessonStudents || []).filter((row) => ids.has(row.studentId))
    if (!lessonStudents.length && !attendances.length && !classroomFeedbacks.length) return []
    return [{ ...lesson, lessonStudents, attendances, classroomFeedbacks } as T]
  })
}

export function parentIntensivePhotos(lessons: ChildLesson[]) {
  return [...new Set(lessons.flatMap((lesson) =>
    (lesson.classroomFeedbacks || []).flatMap((feedback) => feedback.imageUrls || []),
  ))].slice(0, 60)
}
