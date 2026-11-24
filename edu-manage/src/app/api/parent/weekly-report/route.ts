import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import {
  parentActiveEnrollmentWhere,
  visibleClassGroupWhere,
  visibleClassLessonWhere,
  visibleNotificationWhere,
  visibleTeacherWhere,
} from '@/lib/business-visibility'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { buildWeeklyLessonRosters, summarizeWeeklyAttendance } from '@/lib/parent-weekly-report'
import { getLocalWeekRange, todayLocal } from '@/lib/date/local-day'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prisma = await getRequestPrisma()
  const userId = (session.user as { id: string }).id
  const childId = req.nextUrl.searchParams.get('childId') || ''

  const linkedChildren = await getParentChildren(prisma, userId)
  const requestedChild = childId ? findParentChild(linkedChildren, childId) : null
  if (childId && !requestedChild) return NextResponse.json({ error: '学生不存在或无权访问' }, { status: 403 })
  const students = childId ? (requestedChild ? [requestedChild] : []) : linkedChildren
  const studentIds = [...new Set(students.flatMap((student) => student.recordIds))]

  const { start: weekStart, end: weekEnd } = getLocalWeekRange(todayLocal())

  const [classLessons, attendanceRows, gradeRows, notificationRows, leaveRows, feedbackRows] = await Promise.all([
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
          id: true,
          subject: true,
          teacherId: true,
          lessonDate: true,
          group: {
            select: {
              teacherId: true,
              teacherAssignments: { select: { teacherId: true, subject: true } },
              course: { select: { subject: true } },
              enrollments: {
                where: { studentId: { in: studentIds }, ...parentActiveEnrollmentWhere(userId) },
                select: { studentId: true, subjects: true },
              },
            },
          },
          lessonStudents: { select: { studentId: true } },
        },
      }),
      prisma.attendance.findMany({
        where: {
          studentId: { in: studentIds },
          createdAt: { gte: weekStart, lt: weekEnd },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, studentId: true, lessonId: true, status: true, createdAt: true, deletedAt: true },
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
          deletedAt: null,
          leaveDate: { gte: weekStart, lt: weekEnd },
        },
        select: { studentId: true },
      }),
    prisma.classroomFeedback.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        createdAt: { gte: weekStart, lt: weekEnd },
        studentIds: { hasSome: studentIds },
      },
      select: {
        id: true,
        studentIds: true,
        feedbackCourseType: true,
        knowledgePoints: true,
        overallComment: true,
        summary: true,
        lessonContent: true,
        createdAt: true,
        teacher: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    ])

  const weeklyLessonRosters = buildWeeklyLessonRosters(classLessons, studentIds)

  const attendanceByStudent = new Map<string, typeof attendanceRows>()
  attendanceRows.filter((attendance) => attendance.deletedAt === null).forEach((attendance) => {
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
    const scheduleIds = new Set(student.recordIds.flatMap((id) => [...(weeklyLessonRosters.get(id) || [])]))
    const classLessonCount = scheduleIds.size
    const attendanceList = student.recordIds.flatMap((id) => attendanceByStudent.get(id) || [])
    const attendanceSummary = summarizeWeeklyAttendance(scheduleIds, attendanceList)
    const grades = student.recordIds.flatMap((id) => gradesByStudent.get(id) || [])
    const notificationCount = student.recordIds.reduce((sum, id) => sum + (notificationCounts.get(id) || 0), 0)
    const leaveCount = student.recordIds.reduce((sum, id) => sum + (leaveCounts.get(id) || 0), 0)
    const studentRecordIds = new Set(student.recordIds)
    const feedbacks = feedbackRows
      .filter((feedback) => feedback.studentIds.some((id) => studentRecordIds.has(id)))
      .slice(0, 5)

    const totalSchedules = classLessonCount
    const presentCount = attendanceSummary.presentCount
    const absentCount = attendanceSummary.absentCount
    const lateCount = 0
    const attendanceRate = attendanceSummary.attendanceRate

    const normalizedGrades = grades.map((grade) => ({
      subject: grade.assessment?.name || '测评',
      score: Number(grade.score || 0),
      type: grade.assessment?.type || 'STAGE',
    }))

    let comment = ''
    if (totalSchedules === 0) {
      comment = '本周暂无课程安排，请关注下周课程。'
    } else if (attendanceRate == null) {
      comment = '本周课程考勤尚未记录，老师会在课后陆续更新。'
    } else if (attendanceRate === 100 && attendanceSummary.fullyAttendedWeek) {
      comment = '本周已安排课程均有出勤记录，且均正常出勤，继续保持！'
    } else if (attendanceRate === 100) {
      comment = '截至目前已登记课次均为出勤，未登记课次会在课后更新。'
    } else if (attendanceRate >= 80) {
      comment = '本周出勤情况良好，请继续坚持规律学习。'
    } else if (attendanceRate >= 60) {
      comment = '本周有较多缺课，请注意保持学习连贯性。'
    } else {
      comment = '本周出勤率偏低，建议和老师沟通学习情况。'
    }

    if (normalizedGrades.length > 0) {
      // 测评按百分制计（辅导机构测评均为百分制）；如后续引入不同满分测评需按满分归一
      const avgScore = Math.round(normalizedGrades.reduce((sum, grade) => sum + grade.score, 0) / normalizedGrades.length)
      comment += avgScore >= 85
        ? ` 本周测验平均分 ${avgScore} 分（满分 100），表现优秀！`
        : avgScore >= 70
          ? ` 本周测验平均分 ${avgScore} 分（满分 100），继续努力。`
          : ` 本周测验平均分 ${avgScore} 分（满分 100），需要加强复习。`
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
        feedbackCount: feedbacks.length,
      },
      grades: normalizedGrades,
      feedbacks: feedbacks.map((feedback) => ({
        id: feedback.id,
        subject: feedback.feedbackCourseType,
        teacherName: feedback.teacher.name,
        content: feedback.overallComment || feedback.summary || feedback.lessonContent || '',
        knowledgePoints: feedback.knowledgePoints,
        createdAt: feedback.createdAt.toISOString(),
      })),
      comment,
    }
  })

  return NextResponse.json({ weekStart: weekStart.toISOString(), reports })
})
