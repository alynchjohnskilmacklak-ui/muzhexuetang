import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import {
  parentActiveEnrollmentWhere,
  parentLinkedStudentWhere,
  visibleClassGroupWhere,
  visibleClassLessonWhere,
  visibleNotificationWhere,
  visibleScheduleWhere,
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekStart = new Date(today)
  const day = today.getDay()
  weekStart.setDate(today.getDate() - (day === 0 ? 6 : day - 1))

  const results = await Promise.all(students.map(async (student) => {
    const [todaySchedules, todayClassLessons, attendance, unreadCount, leaveRequests] = await Promise.all([
      prisma.schedule.findMany({
        where: {
          ...visibleScheduleWhere,
          startTime: { gte: today, lt: tomorrow },
          students: { some: { studentId: student.id } },
        },
        include: {
          course: { select: { name: true, subject: true } },
          room: { select: { name: true } },
          teacher: { select: { name: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.classLesson.findMany({
        where: {
          ...visibleClassLessonWhere,
          lessonDate: { gte: today, lt: tomorrow },
          group: {
            ...visibleClassGroupWhere,
            teacher: visibleTeacherWhere,
            enrollments: {
              some: {
                studentId: student.id,
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
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.attendance.findMany({
        where: {
          studentId: student.id,
          createdAt: { gte: today, lt: tomorrow },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: {
          userId,
          read: false,
          studentId: student.id,
          createdAt: { gte: today },
          ...visibleNotificationWhere,
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          studentId: student.id,
          leaveDate: { gte: weekStart },
        },
        orderBy: { leaveDate: 'desc' },
      }),
    ])

    const scheduleItems = todaySchedules.map((schedule) => ({
      id: schedule.id,
      courseName: schedule.course?.name || schedule.title,
      subject: schedule.course?.subject || '',
      teacherName: schedule.teacher?.name || '',
      roomName: schedule.room?.name || '',
      startTime: schedule.startTime.toISOString(),
      endTime: schedule.endTime.toISOString(),
    }))

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
      todaySchedules: [...scheduleItems, ...lessonItems].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      attendance: attendance.map((item) => ({
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      })),
      unreadNotifications: unreadCount,
      leaveThisWeek: leaveRequests.length,
    }
  }))

  return NextResponse.json({ today: today.toISOString(), students: results })
})
