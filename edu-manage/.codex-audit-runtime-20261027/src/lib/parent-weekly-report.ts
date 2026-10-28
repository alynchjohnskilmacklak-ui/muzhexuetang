import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'

type WeeklyLessonRow = {
  id: string
  subject: string | null
  group: {
    course: { subject: string | null }
    enrollments: Array<{ studentId: string; subjects: string[] }>
  }
  lessonStudents: Array<{ studentId: string }>
}

export function buildWeeklyLessonRosters(lessons: WeeklyLessonRow[], allowedStudentIds: string[]) {
  const allowed = new Set(allowedStudentIds)
  const rosters = new Map<string, Set<string>>()

  for (const lesson of lessons) {
    const snapshotIds = lesson.lessonStudents.map((row) => row.studentId)
    const subject = lesson.subject || lesson.group.course.subject
    const rosterIds = snapshotIds.length
      ? snapshotIds
      : lesson.group.enrollments
        .filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, subject))
        .map((enrollment) => enrollment.studentId)

    for (const studentId of new Set(rosterIds)) {
      if (!allowed.has(studentId)) continue
      const lessonIds = rosters.get(studentId) || new Set<string>()
      lessonIds.add(lesson.id)
      rosters.set(studentId, lessonIds)
    }
  }

  return rosters
}

export type WeeklyAttendanceRow = {
  id: string
  lessonId: string | null
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'MAKEUP' | string
  deletedAt?: Date | null
}

/** Use only attendance belonging to this child's actual weekly lesson roster. */
export function summarizeWeeklyAttendance(scheduleIds: Set<string>, rows: WeeklyAttendanceRow[]) {
  const uniqueRows = new Map<string, WeeklyAttendanceRow>()
  // Callers fetch newest rows first, so a duplicate lesson keeps its latest state.
  for (const row of rows) {
    if (row.deletedAt) continue
    if (row.lessonId && !scheduleIds.has(row.lessonId)) continue
    const key = row.lessonId || `legacy:${row.id}`
    if (!uniqueRows.has(key)) uniqueRows.set(key, row)
  }
  const attendance = [...uniqueRows.values()]
  const presentCount = attendance.filter((row) => row.status === 'PRESENT' || row.status === 'MAKEUP').length
  const absentCount = attendance.filter((row) => row.status === 'ABSENT').length
  const leaveCount = attendance.filter((row) => row.status === 'LEAVE').length
  const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null
  const allScheduledLessonsRecorded = scheduleIds.size > 0
    && [...scheduleIds].every((lessonId) => uniqueRows.has(lessonId))
  const fullyAttendedWeek = allScheduledLessonsRecorded
    && presentCount === attendance.length
    && attendance.length > 0

  return { attendance, presentCount, absentCount, leaveCount, attendanceRate, fullyAttendedWeek }
}
