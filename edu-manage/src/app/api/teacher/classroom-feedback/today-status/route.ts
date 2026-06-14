import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher, teacherLessonWhere } from '@/lib/teacher-portal'
import { visibleStudentWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)

  const todayLessons = await prisma.classLesson.findMany({
    where: {
      ...teacherLessonWhere(teacher.id),
      lessonDate: { gte: todayStart, lt: todayEnd },
      attendanceSubmittedAt: { not: null },
    },
    include: {
      classroomFeedbacks: {
        where: { teacherId: teacher.id, status: 'PUBLISHED' },
        select: { id: true, studentIds: true },
      },
      group: {
        include: {
          course: { select: { name: true } },
          enrollments: {
            where: { status: 'ACTIVE', student: visibleStudentWhere },
            include: { student: { select: { id: true, name: true, grade: true } } },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  })

  const pendingStudents: Array<{ key: string; id: string; name: string; grade?: string | null; lessonId: string; lessonName: string }> = []
  let completedCount = 0

  for (const lesson of todayLessons) {
    const feedbackedStudentIds = new Set(lesson.classroomFeedbacks.flatMap((feedback) => feedback.studentIds))
    completedCount += lesson.classroomFeedbacks.length
    const lessonName = lesson.group.course?.name || lesson.group.name
    for (const enrollment of lesson.group.enrollments) {
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
