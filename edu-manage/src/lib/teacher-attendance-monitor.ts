import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'

type AttendanceMonitorLesson = {
  lessonDate: Date
  endTime: string
  subject?: string | null
  attendanceSubmittedAt?: Date | null
  attendances: Array<{ id: string }>
  lessonStudents: Array<{ studentId: string }>
  group: {
    course: { subject: string }
    enrollments: Array<{ studentId: string; subjects: string[] }>
  }
}

/** A lesson needs monitoring only after it ends and when it has a valid subject roster. */
export function isAttendanceDue(lesson: AttendanceMonitorLesson, now = new Date()) {
  const [hour, minute] = lesson.endTime.split(':').map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return false

  const lessonEnd = new Date(lesson.lessonDate)
  lessonEnd.setHours(hour, minute, 0, 0)
  if (lessonEnd > now) return false

  return resolveSubjectLessonStudentIds(
    lesson.lessonStudents.map((student) => student.studentId),
    lesson.group.enrollments,
    lesson.subject || lesson.group.course.subject,
    lesson.lessonDate,
    now,
  ).length > 0
}

export function hasSubmittedAttendance(lesson: Pick<AttendanceMonitorLesson, 'attendanceSubmittedAt' | 'attendances'>) {
  return Boolean(lesson.attendanceSubmittedAt || lesson.attendances.length > 0)
}
