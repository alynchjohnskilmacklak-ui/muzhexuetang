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
import { getLocalDayRange, getLocalWeekRange, localDateKey, todayLocal } from '@/lib/date/local-day'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { groupParentStudentRecords, sortParentStudentsByCurrentTerm } from '@/lib/parent-student-selection'

export const dynamic = 'force-dynamic'

function combineLessonDateTime(date: Date, time: string) {
  return new Date(`${localDateKey(date)}T${time}:00+08:00`).toISOString()
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
      identityId: true,
      name: true,
      gender: true,
      birthYear: true,
      grade: true,
      membershipLevel: true,
      updatedAt: true,
      mainTeacher: { select: { name: true } },
      termMemberships: {
        select: {
          grade: true,
          status: true,
          joinedAt: true,
          term: { select: { status: true, startDate: true, name: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })
  const studentIds = students.map((student) => student.id)

  const todayKey = todayLocal()
  const { start: today, end: tomorrow } = getLocalDayRange(todayKey)
  const { start: weekStart, end: weekEnd } = getLocalWeekRange(todayKey)

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
          lessonStudents: { select: { studentId: true } },
          teacher: { select: { name: true } },
          group: {
            include: {
              course: { select: { name: true, subject: true } },
              teacher: { select: { name: true } },
              room: { select: { name: true } },
              teacherAssignments: { select: { teacherId: true, subject: true } },
              enrollments: {
                where: { studentId: { in: studentIds }, ...parentActiveEnrollmentWhere(userId) },
                select: { studentId: true, subjects: true },
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
          deletedAt: null,
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
          deletedAt: null,
          leaveDate: { gte: weekStart, lt: weekEnd },
        },
        select: { studentId: true },
        orderBy: { leaveDate: 'desc' },
      }),
    ])

  const classLessonsByStudent = new Map<string, typeof classLessonRows>()
  classLessonRows.forEach((lesson) => {
    const lessonSubject = lesson.subject
      || lesson.group.teacherAssignments.find((assignment) => assignment.teacherId === lesson.teacherId || assignment.teacherId === lesson.group.teacherId)?.subject
      || lesson.group.course?.subject
    const eligibleStudentIds = resolveSubjectLessonStudentIds(
      lesson.lessonStudents.map((item) => item.studentId),
      lesson.group.enrollments,
      lessonSubject,
      lesson.lessonDate,
    )
    lesson.group.enrollments.forEach(({ studentId }) => {
      if (!eligibleStudentIds.includes(studentId)) return
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
  const parentStudentGroups = groupParentStudentRecords(students)
  const groupsByCanonicalId = new Map(parentStudentGroups.map((group) => [group.student.id, group]))
  const parentStudents = sortParentStudentsByCurrentTerm(parentStudentGroups.map((group) => group.student))
  const results = parentStudents.map((student) => {
    const recordIds = groupsByCanonicalId.get(student.id)?.recordIds || [student.id]
    const todayClassLessons = [...new Map(
      recordIds.flatMap((recordId) => classLessonsByStudent.get(recordId) || []).map((lesson) => [lesson.id, lesson]),
    ).values()]
    const attendance = recordIds.flatMap((recordId) => attendanceByStudent.get(recordId) || [])
    const unreadCount = recordIds.reduce((total, recordId) => total + (unreadCounts.get(recordId) || 0), 0)

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
        membershipLevel: student.membershipLevel,
        mainTeacherName: student.mainTeacher?.name || '未分配',
        recordIds,
      },
      todaySchedules: lessonItems.sort((a, b) => minuteOfDay(a) - minuteOfDay(b)),
      attendance: attendance.map((item) => ({
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      })),
      unreadNotifications: unreadCount,
      leaveThisWeek: recordIds.reduce((total, recordId) => total + (leaveCounts.get(recordId) || 0), 0),
    }
  })

  return NextResponse.json({ today: today.toISOString(), students: results }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
})
