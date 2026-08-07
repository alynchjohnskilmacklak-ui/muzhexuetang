import { NextResponse } from 'next/server'
import { requireCurrentTeacher, teacherLessonWhere, teacherStudentWhere } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'
import { buildTodayFeedbackScopeSet, feedbackTodayScopeKey } from '@/lib/classroom-feedback/today-scope'

export const dynamic = 'force-dynamic'

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const GET = apiHandler(async () => {
  const { teacher, prisma } = await requireCurrentTeacher()

  // Active groups for this teacher
  const groups = await prisma.classGroup.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      OR: [
        { teacherId: teacher.id },
        { teacherAssignments: { some: { teacherId: teacher.id } } },
      ],
    },
    include: {
      course: { select: { id: true, name: true, subject: true, grade: true, type: true } },
      teacherAssignments: { where: { teacherId: teacher.id }, select: { subject: true }, take: 1 },
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          student: { select: { id: true, name: true, grade: true, school: true, remainHours: true } },
        },
      },
      classLessons: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { lessonDate: 'desc' },
        take: 5,
        select: { id: true, lessonDate: true, startTime: true, endTime: true, lessonStudents: { select: { studentId: true } } },
      },
    },
  })

  // Recent lessons
  const now = new Date()
  const { start: todayStart, end: tomorrowStart } = getLocalDayRange(todayLocal())
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
  const recentLessons = await prisma.classLesson.findMany({
    where: {
      ...teacherLessonWhere(teacher.id),
      lessonDate: { gte: sevenDaysAgo },
      status: { not: 'CANCELLED' },
    },
    include: {
      group: {
        include: {
          course: { select: { name: true, type: true } },
          enrollments: {
            where: { status: 'ACTIVE' },
            select: { studentId: true },
          },
        },
      },
      lessonStudents: { select: { studentId: true } },
    },
    orderBy: [{ lessonDate: 'desc' }, { startTime: 'asc' }],
    take: 100,
  })

  // Per-student feedback history. Repeated feedback remains allowed.
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)
  const feedbackHistory = await prisma.classroomFeedback.findMany({
    where: {
      teacherId: teacher.id,
      status: 'PUBLISHED',
    },
    select: { studentIds: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  const todayFeedbacks = await prisma.classroomFeedback.findMany({
    where: {
      teacherId: teacher.id,
      status: 'PUBLISHED',
      createdAt: { gte: todayStart, lt: tomorrowStart },
    },
    select: {
      studentIds: true,
      feedbackGroupId: true,
      classLesson: { select: { groupId: true } },
    },
  })
  const feedbackedTodayIds = [...new Set(todayFeedbacks.flatMap((feedback) => feedback.studentIds))]
  const feedbackedTodayScopes = buildTodayFeedbackScopeSet(todayFeedbacks)

  // Build student feedback map
  const studentFeedbackMap = new Map<string, Date>()
  for (const fb of feedbackHistory) {
    for (const sid of fb.studentIds) {
      if (!studentFeedbackMap.has(sid) || fb.createdAt > studentFeedbackMap.get(sid)!) {
        studentFeedbackMap.set(sid, fb.createdAt)
      }
    }
  }

  // Per-student attendance rates
  const students = await prisma.student.findMany({
    where: teacherStudentWhere(teacher.id),
    select: { id: true },
  })
  const studentIds = students.map(s => s.id)

  const attendanceRecords = await prisma.attendance.findMany({
    where: { studentId: { in: studentIds }, createdAt: { gte: fourteenDaysAgo } },
    select: { studentId: true, status: true },
  })
  const attendanceMap = new Map<string, { total: number; present: number }>()
  for (const a of attendanceRecords) {
    const entry = attendanceMap.get(a.studentId) || { total: 0, present: 0 }
    entry.total++
    if (a.status === 'PRESENT' || a.status === 'MAKEUP') entry.present++
    attendanceMap.set(a.studentId, entry)
  }

  // Assemble response
  const groupsOut = groups.map(g => ({
    id: g.id,
    name: g.name,
    courseName: g.course?.name || '-',
    courseType: g.course?.type || 'GROUP',
    intensiveMode: g.intensiveMode,
    teachingType: g.teachingType,
    subject: g.teacherAssignments[0]?.subject || g.course?.subject || null,
    grade: g.course?.grade || null,
    studentCount: g.enrollments.length,
    recentLesson: g.classLessons[0] ? {
      date: g.classLessons[0].lessonDate,
      time: `${g.classLessons[0].startTime}-${g.classLessons[0].endTime}`,
    } : null,
    students: g.enrollments.map(e => {
      const att = attendanceMap.get(e.student.id)
      const attRate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null
      const lastFb = studentFeedbackMap.get(e.student.id)
      const daysSinceLastFeedback = lastFb
        ? Math.floor((now.getTime() - lastFb.getTime()) / 86400000)
        : null
      return {
        id: e.student.id,
        name: e.student.name,
        grade: e.student.grade,
        school: e.student.school,
        remainHours: g.intensiveMode === 'INTENSIVE' ? e.remainHours : e.student.remainHours,
        attendanceRate: attRate,
        daysSinceLastFeedback,
        lastFeedbackAt: lastFb,
        todayFeedback: feedbackedTodayScopes.has(feedbackTodayScopeKey(g.id, e.student.id)),
      }
    }),
  }))

  const todayKey = localDateKey(now)
  const lessonsOut = [...recentLessons]
    .sort((a, b) => {
      const aDate = new Date(a.lessonDate)
      const bDate = new Date(b.lessonDate)
      const aIsToday = localDateKey(aDate) === todayKey
      const bIsToday = localDateKey(bDate) === todayKey
      if (aIsToday !== bIsToday) return aIsToday ? -1 : 1
      const aDistance = Math.abs(new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate()).getTime() - todayStart.getTime())
      const bDistance = Math.abs(new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate()).getTime() - todayStart.getTime())
      if (aDistance !== bDistance) return aDistance - bDistance
      return String(a.startTime || '').localeCompare(String(b.startTime || ''))
    })
    .map(l => ({
    id: l.id,
    groupId: l.groupId,
    groupName: l.group?.course?.name || '-',
    courseType: l.group?.course?.type || 'GROUP',
    intensiveMode: l.group?.intensiveMode,
    teachingType: l.group?.teachingType,
    lessonDate: l.lessonDate,
    startTime: l.startTime,
    endTime: l.endTime,
    studentIds: l.group?.intensiveMode === 'INTENSIVE'
      ? l.lessonStudents.map((item) => item.studentId)
      : l.group?.enrollments?.map(e => e.studentId) || [],
  }))

  return NextResponse.json({ groups: groupsOut, lessons: lessonsOut, feedbackedTodayIds })
})
