import { getRequestPrisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { getEffectiveMealMenuForDate } from '@/lib/meal-template'
import {
  parentActiveEnrollmentWhere,
  parentLinkedStudentWhere,
  parentVisibleExamPaperWhere,
  parentVisibleLessonWhere,
  parentVisiblePerformancePostWhere,
  visibleClassroomFeedbackWhere,
  visibleNotificationWhere,
  visibleTeacherWhere,
} from '@/lib/business-visibility'
import { redactFeedbackForParent } from '@/lib/classroom-feedback/access'

export async function getParentDashboardData(userId: string, prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? await getRequestPrisma()
  const students = await prisma.student.findMany({
    where: parentLinkedStudentWhere(userId),
    select: {
      id: true,
      name: true,
      grade: true,
      membershipLevel: true,
      mainTeacher: { select: { id: true, name: true } },
      enrollments: {
        where: parentActiveEnrollmentWhere(userId),
        select: {
          group: {
            select: {
              teacher: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })

  const studentIds = students.map((student) => student.id)
  const studentTeachers: Record<string, string[]> = {}
  for (const student of students) {
    const teacherSet = new Set<string>()
    if (student.mainTeacher?.name) teacherSet.add(student.mainTeacher.name)
    for (const enrollment of student.enrollments) {
      if (enrollment.group?.teacher?.name) teacherSet.add(enrollment.group.teacher.name)
    }
    studentTeachers[student.id] = [...teacherSet]
  }

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const [
    todayClassLessons,
    notifications,
    latestPost,
    latestClassroomFeedback,
    monthMoods,
    monthClassroomFeedbacks,
    monthAttendances,
    badgeRows,
    todayAttendances,
    todayFeedbackRows,
    todayPaperRows,
    todayMeal,
  ] = await Promise.all([
    prisma.classLesson.findMany({
      where: {
        ...parentVisibleLessonWhere(userId),
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        lessonDate: { gte: todayStart, lt: todayEnd },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        lessonDate: true,
        attendanceSubmittedAt: true,
        group: {
          select: {
            course: { select: { name: true } },
            teacher: { select: { name: true } },
            room: { select: { name: true } },
            enrollments: {
              where: parentActiveEnrollmentWhere(userId),
              select: { student: { select: { id: true, name: true } } },
            },
          },
        },
        teacher: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.notification.findMany({
      where: { userId, ...visibleNotificationWhere },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.performancePost.findFirst({
      where: parentVisiblePerformancePostWhere(userId),
      include: { student: { select: { name: true } }, teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.classroomFeedback.findFirst({
      where: {
        ...visibleClassroomFeedbackWhere,
        studentIds: { hasSome: studentIds },
        teacher: visibleTeacherWhere,
      },
      include: { teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.performancePost.findMany({
      where: { ...parentVisiblePerformancePostWhere(userId), createdAt: { gte: monthStart, lt: monthEnd } },
      select: { createdAt: true, mood: true, id: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.classroomFeedback.findMany({
      where: {
        ...visibleClassroomFeedbackWhere,
        studentIds: { hasSome: studentIds },
        teacher: visibleTeacherWhere,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      select: { id: true, createdAt: true, summary: true, studentIds: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.attendance.findMany({
      where: {
        student: parentLinkedStudentWhere(userId),
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      select: { status: true, studentId: true },
    }),
    prisma.achievementBadge.findMany({
      where: { student: parentLinkedStudentWhere(userId) },
      select: { studentId: true },
    }),
    prisma.attendance.findMany({
      where: {
        student: parentLinkedStudentWhere(userId),
        OR: [
          { lesson: { lessonDate: { gte: todayStart, lt: todayEnd } } },
          { schedule: { startTime: { gte: todayStart, lt: todayEnd } } },
        ],
      },
      select: { id: true, status: true, hoursDeducted: true, createdAt: true, lessonId: true, scheduleId: true, studentId: true },
    }),
    prisma.classroomFeedback.findMany({
      where: {
        ...visibleClassroomFeedbackWhere,
        studentIds: { hasSome: studentIds },
        teacher: visibleTeacherWhere,
        createdAt: { gte: todayStart, lt: todayEnd },
      },
      select: {
        id: true,
        createdAt: true,
        studentIds: true,
        summary: true,
        feedbackCourseType: true,
        teacher: { select: { name: true } },
        classLesson: {
          select: {
            subject: true,
            group: {
              select: {
                course: { select: { subject: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.examPaper.findMany({
      where: {
        ...parentVisibleExamPaperWhere(userId),
        createdAt: { gte: todayStart, lt: todayEnd },
      },
      select: { id: true, studentId: true },
    }),
    getEffectiveMealMenuForDate(today, prisma),
  ])

  const filteredTodayClassLessons = todayClassLessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.group?.course?.name || '-',
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    teacherName: lesson.teacher?.name || lesson.group?.teacher?.name || null,
    roomName: lesson.group?.room?.name || null,
    studentIds: lesson.group?.enrollments?.map((enrollment) => enrollment.student?.id).filter(Boolean) || [],
    studentNames: lesson.group?.enrollments?.map((enrollment) => enrollment.student?.name).filter(Boolean) || [],
    startTimeRaw: lesson.lessonDate ? `${new Date(lesson.lessonDate).toISOString().slice(0, 10)}T${lesson.startTime}` : null,
    endTimeRaw: lesson.lessonDate ? `${new Date(lesson.lessonDate).toISOString().slice(0, 10)}T${lesson.endTime}` : null,
    attendanceSubmittedAt: lesson.attendanceSubmittedAt?.toISOString() || null,
  }))

  const presentCount = monthAttendances.filter((attendance) => attendance.status === 'PRESENT').length
  const totalCount = monthAttendances.length
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100
  const badgeCount = badgeRows.length
  const todayFeedbackCount = todayFeedbackRows.length
  const todayPaperCount = todayPaperRows.length
  const studentStats = Object.fromEntries(studentIds.map((studentId) => {
    const studentAttendances = monthAttendances.filter((attendance) => attendance.studentId === studentId)
    const studentPresentCount = studentAttendances.filter((attendance) => attendance.status === 'PRESENT').length
    return [studentId, {
      attendanceRate: studentAttendances.length > 0 ? Math.round((studentPresentCount / studentAttendances.length) * 100) : 100,
      badgeCount: badgeRows.filter((badge) => badge.studentId === studentId).length,
      todayFeedbackCount: todayFeedbackRows.filter((feedback) => feedback.studentIds.includes(studentId)).length,
      todayPaperCount: todayPaperRows.filter((paper) => paper.studentId === studentId).length,
    }]
  }))
  const parentLatestClassroomFeedback = latestClassroomFeedback
    ? redactFeedbackForParent(latestClassroomFeedback, studentIds)
    : null
  const parentMonthClassroomFeedbacks = monthClassroomFeedbacks.map((feedback) => ({
    ...feedback,
    studentIds: feedback.studentIds.filter((studentId) => studentIds.includes(studentId)),
  }))

  return {
    parentUserId: userId,
    students: students.map(({ id, name, grade, membershipLevel }) => ({ id, name, grade, membershipLevel })),
    studentTeachers,
    todaySchedules: [],
    todayClassLessons: filteredTodayClassLessons,
    notifications,
    latestPost,
    latestClassroomFeedback: parentLatestClassroomFeedback,
    monthMoods,
    monthClassroomFeedbacks: parentMonthClassroomFeedbacks,
    attendanceRate,
    badgeCount,
    studentStats,
    todayAttendances,
    todayFeedbacks: todayFeedbackRows.map((feedback) => ({
      id: feedback.id,
      createdAt: feedback.createdAt,
      studentIds: feedback.studentIds.filter((studentId) => studentIds.includes(studentId)),
      summary: feedback.summary,
      teacherName: feedback.teacher?.name || null,
      subject:
        feedback.classLesson?.subject
        || feedback.feedbackCourseType
        || feedback.classLesson?.group?.course?.subject
        || null,
    })),
    todayFeedbackCount,
    todayPaperCount,
    todayMeal,
  }
}
