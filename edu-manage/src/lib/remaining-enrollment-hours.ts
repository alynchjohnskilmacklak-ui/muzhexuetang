import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'

type EnrollmentLike = {
  enrolledAt: Date
  subjects: string[]
}

type LessonLike = {
  lessonDate: Date
  startTime: string
  subject: string | null
  status: string
  deletedAt: Date | null
}

function lessonStartAt(lesson: Pick<LessonLike, 'lessonDate' | 'startTime'>) {
  const date = lesson.lessonDate.toISOString().slice(0, 10)
  return new Date(`${date}T${lesson.startTime}:00+08:00`)
}

/** Counts active sessions starting at or after enrollment in the subjects the student actually joined. */
export function countRemainingEnrollmentLessons(
  enrollment: EnrollmentLike,
  lessons: LessonLike[],
  defaultSubject: string | null,
) {
  return lessons.filter((lesson) => {
    if (lesson.deletedAt || !['SCHEDULED', 'IN_PROGRESS'].includes(lesson.status)) return false
    const subject = lesson.subject || defaultSubject
    if (!enrollmentIncludesSubject(enrollment.subjects, subject)) return false
    return lessonStartAt(lesson).getTime() >= enrollment.enrolledAt.getTime()
  }).length
}
