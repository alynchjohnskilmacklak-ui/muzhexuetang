import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import {
  parentActiveEnrollmentWhere,
  parentLinkedStudentWhere,
  visibleClassGroupWhere,
  visibleClassLessonWhere,
  visibleNotificationWhere,
  visibleTeacherWhere,
} from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

function combineLessonDateTime(date: Date, time: string) {
  const [hour, minute] = time.split(':').map(Number)
  const value = new Date(date)
  value.setHours(hour || 0, minute || 0, 0, 0)
  return value.toISOString()
}

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  const userId = (session.user as { id: string }).id

  const students = await prisma.student.findMany({
    where: parentLinkedStudentWhere(userId),
    select: {
      id: true,
      name: true,
      grade: true,
      mainTeacher: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })
  const studentIds = students.map((student) => student.id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekStart = new Date(today)
  const day = today.getDay()
  weekStart.setDate(today.getDate() - (day === 0 ? 6 : day - 1))

  const [classLessonRows, attendanceRows, notificationRows, leaveRows] = await Promise.all([
      prisma.classLesson.findMany({
        where: {
          ...visibleClassLessonWhere,
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
          lessonDate: { gte: today, lt: tomorrow },
          group: {
            ...visibleClassGroupWhere,
            teacher: visibleTeacherWhere,
            enrollments: {
              some: {
                studentId: { in: studentIds },
                ...parentActiveEnrollmentWhere(userId),
              },
            },
          },
        },
        include: {
          teacher: { select: { name: true } },
          group: {
            include: {
              course: { select: { name: true, subject: true } },
              teacher: { select: { name: true } },
              room: { select: { name: true } },
              enrollments: {
                where: { studentId: { in: studentIds }, ...parentActiveEnrollmentWhere(userId) },
                select: { studentId: true },
              },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.attendance.findMany({
        where: {
          studentId: { in: studentIds },
          createdAt: { gte: today, lt: tomorrow },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: {
          userId,
          read: false,
          studentId: { in: studentIds },
          createdAt: { gte: today },
          ...visibleNotificationWhere,
        },
        select: { studentId: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          studentId: { in: studentIds },
          leaveDate: { gte: weekStart },
        },
        select: { studentId: true },
        orderBy: { leaveDate: 'desc' },
      }),
    ])

  const classLessonsByStudent = new Map<string, typeof classLessonRows>()
  classLessonRows.forEach((lesson) => {
    lesson.group.enrollments.forEach(({ studentId }) => {
      const items = classLessonsByStudent.get(studentId) || []
      items.push(lesson)
      classLessonsByStudent.set(studentId, items)
    })
  })

  const attendanceByStudent = new Map<string, typeof attendanceRows>()
  attendanceRows.forEach((attendance) => {
    const items = attendanceByStudent.get(attendance.studentId) || []
    items.push(attendance)
    attendanceByStudent.set(attendance.studentId, items)
  })

  const unreadCounts = new Map<string, number>()
  notificationRows.forEach(({ studentId }) => {
    if (studentId) unreadCounts.set(studentId, (unreadCounts.get(studentId) || 0) + 1)
  })

  const leaveCounts = new Map<string, number>()
  leaveRows.forEach(({ studentId }) => {
    leaveCounts.set(studentId, (leaveCounts.get(studentId) || 0) + 1)
  })

  const minuteOfDay = (item: { startTime: string }) => {
    const d = new Date(item.startTime)
    return d.getHours() * 60 + d.getMinutes()
  }
  const results = students.map((student) => {
    const todayClassLessons = classLessonsByStudent.get(student.id) || []
    const attendance = attendanceByStudent.get(student.id) || []
    const unreadCount = unreadCounts.get(student.id) || 0

    const lessonItems = todayClassLessons.map((lesson) => {
      return {
        id: lesson.id,
        courseName: lesson.group.course?.name || lesson.group.name,
        subject: lesson.group.course?.subject || lesson.subject || '',
        teacherName: lesson.teacher?.name || lesson.group.teacher?.name || '',
        roomName: lesson.group.room?.name || '',
        startTime: combineLessonDateTime(lesson.lessonDate, lesson.startTime),
        endTime: combineLessonDateTime(lesson.lessonDate, lesson.endTime),
      }
    })

    return {
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        mainTeacherName: student.mainTeacher?.name || '未分配',
      },
      todaySchedules: lessonItems.sort((a, b) => minuteOfDay(a) - minuteOfDay(b)),
      attendance: attendance.map((item) => ({
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      })),
      unreadNotifications: unreadCount,
      leaveThisWeek: leaveCounts.get(student.id) || 0,
    }
  })

  return NextResponse.json({ today: today.toISOString(), students: results }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
  })
})
