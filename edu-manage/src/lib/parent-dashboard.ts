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

export async function getParentDashboardData(userId: string, prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? await getRequestPrisma()
  const students = await prisma.student.findMany({
    where: parentLinkedStudentWhere(userId),
    include: {
      mainTeacher: { select: { id: true, name: true } },
      enrollments: {
        where: parentActiveEnrollmentWhere(userId),
        include: { group: { include: { course: true, teacher: { select: { id: true, name: true } } } } },
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

  const todayClassLessons = await prisma.classLesson.findMany({
    where: {
      ...parentVisibleLessonWhere(userId),
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      lessonDate: { gte: todayStart, lt: todayEnd },
    },
    include: {
      group: {
        include: {
          course: true,
          teacher: { select: { id: true, name: true } },
          room: true,
          enrollments: {
            where: parentActiveEnrollmentWhere(userId),
            include: { student: { select: { id: true, name: true } } },
          },
        },
      },
      teacher: { select: { id: true, name: true } },
    },
    orderBy: { startTime: 'asc' },
  })

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

  const [
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
  ] = await Promise.all([
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
      select: { id: true, studentIds: true },
    }),
    prisma.examPaper.findMany({
      where: {
        ...parentVisibleExamPaperWhere(userId),
        createdAt: { gte: todayStart, lt: todayEnd },
      },
      select: { id: true, studentId: true },
    }),
  ])

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
  const todayMeal = await getEffectiveMealMenuForDate(today, prisma)

  return {
    students,
    studentTeachers,
    todaySchedules: [],
    todayClassLessons: filteredTodayClassLessons,
    notifications,
    latestPost,
    latestClassroomFeedback,
    monthMoods,
    monthClassroomFeedbacks,
    attendanceRate,
    badgeCount,
    studentStats,
    todayAttendances,
    todayFeedbackCount,
    todayPaperCount,
    todayMeal,
  }
}
