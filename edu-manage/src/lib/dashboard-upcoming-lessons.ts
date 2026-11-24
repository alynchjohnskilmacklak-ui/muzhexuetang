import { findTeacherAssignmentForSubject } from '@/lib/teacher-assignment-subject'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { localDateKey } from '@/lib/date/local-day'

type UpcomingLessonRow = {
  id: string
  groupId: string
  lessonDate: Date
  startTime: string
  endTime: string
  status: string
  subject: string | null
  teacherId: string | null
  teacher: { name: string | null } | null
  lessonStudents: Array<{ studentId: string }>
  group: {
    name: string
    teacher: { id: string; name: string | null }
    course: { subject: string | null }
    room: { name: string | null } | null
    teacherAssignments: Array<{
      teacherId: string
      subject: string | null
      teacher: { name: string | null } | null
    }>
    enrollments: Array<{ studentId: string; subjects: string[] }>
  }
}

export function shouldShowWeekendNextLessons(
  term: { status: string; kind: string | null | undefined } | null | undefined,
  todayLessonCount: number,
) {
  return term?.status === 'ACTIVE' && term.kind === 'WEEKEND' && todayLessonCount === 0
}

export function selectNextScheduledLessonDay<T extends Pick<UpcomingLessonRow, 'lessonDate' | 'startTime' | 'status'>>(
  rows: T[],
  todayKey: string,
) {
  const upcoming = rows
    .filter((row) => row.status === 'SCHEDULED' && localDateKey(row.lessonDate) > todayKey)
    .sort((left, right) => {
      const dateCompare = localDateKey(left.lessonDate).localeCompare(localDateKey(right.lessonDate))
      return dateCompare || left.startTime.localeCompare(right.startTime)
    })
  const date = upcoming[0] ? localDateKey(upcoming[0].lessonDate) : null
  return {
    date,
    lessons: date ? upcoming.filter((row) => localDateKey(row.lessonDate) === date) : [],
  }
}

export function presentDashboardUpcomingLesson(lesson: UpcomingLessonRow, date: string) {
  const defaultSubject = lesson.group.course.subject
  const teacherId = lesson.teacherId || lesson.group.teacher.id
  const assignment = findTeacherAssignmentForSubject(
    lesson.group.teacherAssignments,
    lesson.subject ?? defaultSubject,
    defaultSubject,
    teacherId,
  )
  const subject = lesson.subject ?? assignment?.subject ?? defaultSubject
  const subjectTeacher = findTeacherAssignmentForSubject(
    lesson.group.teacherAssignments,
    subject,
    defaultSubject,
    teacherId,
  )
  const studentCount = resolveSubjectLessonStudentIds(
    lesson.lessonStudents.map((student) => student.studentId),
    lesson.group.enrollments,
    subject,
    lesson.lessonDate,
  ).length

  return {
    id: lesson.id,
    groupId: lesson.groupId,
    groupName: lesson.group.name,
    subject: subject || '未标注科目',
    teacher: lesson.teacher?.name || subjectTeacher?.teacher?.name || lesson.group.teacher?.name || '教师待定',
    room: lesson.group.room?.name || '未分配教室',
    studentCount,
    date,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
  }
}
