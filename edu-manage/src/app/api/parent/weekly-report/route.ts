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

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const students = await prisma.student.findMany({
    where: parentLinkedStudentWhere(userId),
    select: { id: true, name: true, grade: true },
    orderBy: { name: 'asc' },
  })

  const now = new Date()
  const weekStart = new Date(now)
  const day = now.getDay()
  weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const reports = await Promise.all(students.map(async (student) => {
    const [scheduleCount, classLessonCount, attendanceList, grades, notificationCount, leaveCount] = await Promise.all([
      prisma.schedule.count({
        where: {
          ...visibleScheduleWhere,
          startTime: { gte: weekStart, lt: weekEnd },
          students: { some: { studentId: student.id } },
        },
      }),
      prisma.classLesson.count({
        where: {
          ...visibleClassLessonWhere,
          lessonDate: { gte: weekStart, lt: weekEnd },
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
      }),
      prisma.attendance.findMany({
        where: {
          studentId: student.id,
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.gradeRecord.findMany({
        where: {
          studentId: student.id,
          createdAt: { gte: weekStart, lt: weekEnd },
        },
        select: {
          score: true,
          assessment: { select: { name: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: {
          userId,
          studentId: student.id,
          createdAt: { gte: weekStart, lt: weekEnd },
          ...visibleNotificationWhere,
        },
      }),
      prisma.leaveRequest.count({
        where: {
          studentId: student.id,
          leaveDate: { gte: weekStart, lt: weekEnd },
        },
      }),
    ])

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
  }))

  return NextResponse.json({ weekStart: weekStart.toISOString(), reports })
})
