import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { requireCurrentTeacher, teacherLessonWhere, teacherStudentWhere } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_req: NextRequest) => {
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
      course: { select: { id: true, name: true, subject: true, type: true } },
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
        select: { id: true, lessonDate: true, startTime: true, endTime: true },
      },
    },
  })

  // Recent lessons
  const now = new Date()
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
    },
    orderBy: [{ lessonDate: 'desc' }, { startTime: 'asc' }],
    take: 100,
  })

  // Per-student feedback status (last 14 days)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)
  const recentFeedbacks = await prisma.classroomFeedback.findMany({
    where: {
      teacherId: teacher.id,
      createdAt: { gte: fourteenDaysAgo },
    },
    select: { studentIds: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  // Build student feedback map
  const studentFeedbackMap = new Map<string, Date>()
  for (const fb of recentFeedbacks) {
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
    grade: g.course?.subject || null,
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
        remainHours: e.student.remainHours,
        attendanceRate: attRate,
        daysSinceLastFeedback,
        lastFeedbackAt: lastFb,
      }
    }),
  }))

  const lessonsOut = recentLessons.map(l => ({
    id: l.id,
    groupId: l.groupId,
    groupName: l.group?.course?.name || '-',
    courseType: l.group?.course?.type || 'GROUP',
    lessonDate: l.lessonDate,
    startTime: l.startTime,
    endTime: l.endTime,
    studentIds: l.group?.enrollments?.map(e => e.studentId) || [],
  }))

  return NextResponse.json({ groups: groupsOut, lessons: lessonsOut })
})
