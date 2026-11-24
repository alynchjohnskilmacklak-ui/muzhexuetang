import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher, teacherLessonWhere } from '@/lib/teacher-portal'
import { visibleStudentWhere } from '@/lib/business-visibility'
import { hasSubmittedLessonAttendance } from '@/lib/attendance-submission'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'
import { loadLessonFeedbackBlockReasons } from '@/lib/classroom-feedback/lesson-eligibility'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const { start: todayStart, end: todayEnd } = getLocalDayRange(todayLocal())

  const todayLessons = await prisma.classLesson.findMany({
    where: {
      ...teacherLessonWhere(teacher.id),
      deletedAt: null,
      lessonDate: { gte: todayStart, lt: todayEnd },
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
    },
    include: {
      classroomFeedbacks: {
        where: { teacherId: teacher.id, status: 'PUBLISHED', deletedAt: null },
        select: { id: true, studentIds: true },
      },
      group: {
        include: {
          course: { select: { name: true, subject: true } },
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null, student: visibleStudentWhere },
            select: { subjects: true, student: { select: { id: true, name: true, grade: true } } },
          },
        },
      },
      attendances: { where: { deletedAt: null }, select: { studentId: true, status: true } },
      lessonStudents: { select: { studentId: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  const lessonRosters = todayLessons.map((lesson) => ({
    id: lesson.id,
    lessonDate: lesson.lessonDate,
    studentIds: resolveSubjectLessonStudentIds(
      lesson.lessonStudents.map((student) => student.studentId),
      lesson.group.enrollments.map((enrollment) => ({
        studentId: enrollment.student.id,
        subjects: enrollment.subjects,
      })),
      lesson.subject || lesson.group.course?.subject,
      lesson.lessonDate,
    ),
  }))
  const rosterByLessonId = new Map(lessonRosters.map((lesson) => [lesson.id, lesson.studentIds]))
  const blockedReasonsByLesson = await loadLessonFeedbackBlockReasons(prisma, lessonRosters)

  const pendingStudents: Array<{ key: string; id: string; name: string; grade?: string | null; lessonId: string; lessonName: string }> = []
  let completedCount = 0

  for (const lesson of todayLessons) {
    const expectedStudentIds = rosterByLessonId.get(lesson.id) || []
    if (!hasSubmittedLessonAttendance({
      attendanceSubmittedAt: lesson.attendanceSubmittedAt,
      status: lesson.status,
      attendances: lesson.attendances,
      expectedStudentIds,
    })) continue

    const feedbackedStudentIds = new Set(lesson.classroomFeedbacks.flatMap((feedback) => feedback.studentIds))
    const blockedStudentIds = new Set(Object.keys(blockedReasonsByLesson.get(lesson.id) || {}))
    completedCount += lesson.classroomFeedbacks.length
    const lessonName = lesson.group.course?.name || lesson.group.name
    const expectedStudentIdSet = new Set(expectedStudentIds)
    for (const enrollment of lesson.group.enrollments) {
      if (!expectedStudentIdSet.has(enrollment.student.id)) continue
      if (blockedStudentIds.has(enrollment.student.id)) continue
      if (feedbackedStudentIds.has(enrollment.student.id)) continue
      pendingStudents.push({
        key: `${lesson.id}-${enrollment.student.id}`,
        id: enrollment.student.id,
        name: enrollment.student.name,
        grade: enrollment.student.grade,
        lessonId: lesson.id,
        lessonName,
      })
    }
  }

  return NextResponse.json({
    totalLessons: todayLessons.length,
    completedCount,
    pendingCount: pendingStudents.length,
    pendingStudents,
  })
})
