import { NextRequest, NextResponse } from 'next/server'
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

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id
  const childId = req.nextUrl.searchParams.get('childId') || ''

  const students = await prisma.student.findMany({
    where: parentLinkedStudentWhere(userId),
    select: { id: true, name: true, grade: true },
    orderBy: { name: 'asc' },
  })
  const allStudentIds = students.map((student) => student.id)
  const studentIds = childId && allStudentIds.includes(childId) ? [childId] : allStudentIds

  const now = new Date()
  const weekStart = new Date(now)
  const day = now.getDay()
  weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const [schedules, classLessons, attendanceRows, gradeRows, notificationRows, leaveRows] = await Promise.all([
      prisma.schedule.findMany({
        where: {
          ...visibleScheduleWhere,
          startTime: { gte: weekStart, lt: weekEnd },
          students: { some: { studentId: { in: studentIds } } },
        },
        select: { students: { where: { studentId: { in: studentIds } }, select: { studentId: true } } },
      }),
      prisma.classLesson.findMany({
        where: {
          ...visibleClassLessonWhere,
          lessonDate: { gte: weekStart, lt: weekEnd },
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
        select: {
          group: {
            select: {
              enrollments: {
                where: { studentId: { in: studentIds }, ...parentActiveEnrollmentWhere(userId) },
                select: { studentId: true },
              },
            },
          },
        },
      }),
      prisma.attendance.findMany({
        where: {
          studentId: { in: studentIds },
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.gradeRecord.findMany({
        where: {
          studentId: { in: studentIds },
          createdAt: { gte: weekStart, lt: weekEnd },
        },
        select: {
          studentId: true,
          score: true,
          assessment: { select: { name: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: {
          userId,
          studentId: { in: studentIds },
          createdAt: { gte: weekStart, lt: weekEnd },
          ...visibleNotificationWhere,
        },
        select: { studentId: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          studentId: { in: studentIds },
          leaveDate: { gte: weekStart, lt: weekEnd },
        },
        select: { studentId: true },
      }),
    ])

  const scheduleCounts = new Map<string, number>()
  schedules.forEach((schedule) => {
    schedule.students.forEach(({ studentId }) => {
      scheduleCounts.set(studentId, (scheduleCounts.get(studentId) || 0) + 1)
    })
  })

  const classLessonCounts = new Map<string, number>()
  classLessons.forEach((lesson) => {
    lesson.group.enrollments.forEach(({ studentId }) => {
      classLessonCounts.set(studentId, (classLessonCounts.get(studentId) || 0) + 1)
    })
  })

  const attendanceByStudent = new Map<string, typeof attendanceRows>()
  attendanceRows.forEach((attendance) => {
    const items = attendanceByStudent.get(attendance.studentId) || []
    items.push(attendance)
    attendanceByStudent.set(attendance.studentId, items)
  })

  const gradesByStudent = new Map<string, typeof gradeRows>()
  gradeRows.forEach((grade) => {
    const items = gradesByStudent.get(grade.studentId) || []
    items.push(grade)
    gradesByStudent.set(grade.studentId, items)
  })

  const notificationCounts = new Map<string, number>()
  notificationRows.forEach(({ studentId }) => {
    if (studentId) notificationCounts.set(studentId, (notificationCounts.get(studentId) || 0) + 1)
  })

  const leaveCounts = new Map<string, number>()
  leaveRows.forEach(({ studentId }) => {
    leaveCounts.set(studentId, (leaveCounts.get(studentId) || 0) + 1)
  })

  const reports = students.map((student) => {
    const scheduleCount = scheduleCounts.get(student.id) || 0
    const classLessonCount = classLessonCounts.get(student.id) || 0
    const attendanceList = attendanceByStudent.get(student.id) || []
    const grades = gradesByStudent.get(student.id) || []
    const notificationCount = notificationCounts.get(student.id) || 0
    const leaveCount = leaveCounts.get(student.id) || 0

    const totalSchedules = scheduleCount + classLessonCount
    const presentCount = attendanceList.filter(item => item.status === 'PRESENT').length
    const absentCount = attendanceList.filter(item => item.status === 'ABSENT').length
    const lateCount = 0
    const attendanceRate = totalSchedules > 0
      ? Math.round((presentCount / totalSchedules) * 100)
      : 100

    const normalizedGrades = grades.map((grade) => ({
      subject: grade.assessment?.name || '测评',
      score: Number(grade.score || 0),
      type: grade.assessment?.type || 'STAGE',
    }))

    let comment = ''
    if (totalSchedules === 0) {
      comment = '本周暂无课程安排，请关注下周课程。'
    } else if (attendanceRate === 100) {
      comment = '本周全勤，学习态度积极，继续保持！'
    } else if (attendanceRate >= 80) {
      comment = '本周出勤情况良好，请继续坚持规律学习。'
    } else if (attendanceRate >= 60) {
      comment = '本周有较多缺课，请注意保持学习连贯性。'
    } else {
      comment = '本周出勤率偏低，建议和老师沟通学习情况。'
    }

    if (normalizedGrades.length > 0) {
      const avgScore = Math.round(normalizedGrades.reduce((sum, grade) => sum + grade.score, 0) / normalizedGrades.length)
      comment += avgScore >= 85
        ? ` 本周测验平均分 ${avgScore} 分，表现优秀！`
        : avgScore >= 70
          ? ` 本周测验平均分 ${avgScore} 分，继续努力。`
          : ` 本周测验平均分 ${avgScore} 分，需要加强复习。`
    }

    return {
      student: { id: student.id, name: student.name, grade: student.grade },
      weekRange: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
      stats: {
        totalSchedules,
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
        attendanceRate,
        notificationCount,
      },
      grades: normalizedGrades,
      comment,
    }
  })

  return NextResponse.json({ weekStart: weekStart.toISOString(), reports })
})
