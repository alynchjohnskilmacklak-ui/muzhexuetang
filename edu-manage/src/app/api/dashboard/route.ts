import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import {
  activeEnrollmentWhere,
  makeupEligibleClassGroupWhere,
  visibleClassGroupWhere,
  visibleStudentWhere,
} from '@/lib/business-visibility'
import { summarizeParentMessageWorkflow } from '@/lib/parent-message-workflow'
import { intensiveTeachingTypeLabel } from '@/lib/intensive-class'
import { hasSubmittedLessonAttendance } from '@/lib/attendance-submission'

export const dynamic = 'force-dynamic'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000)
}

function roundHours(value: number) {
  return Number(value.toFixed(1))
}

function hoursBetween(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / 3600000)
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatTimeAgo(date: Date) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  return `${Math.floor(diffHours / 24)}天前`
}

function combineLessonDateTime(date: Date, time: string) {
  const [hour = '0', minute = '0'] = time.split(':')
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(hour), Number(minute))
}

function getStatusLabel(start: Date, end: Date, attendanceSubmitted: boolean) {
  const now = new Date()
  if (attendanceSubmitted) return '已完成' as const
  if (now < start) return '待上课' as const
  if (now >= start && now <= end) return '上课中' as const
  return '待考勤' as const
}

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const today = startOfDay(now)
  const todayEnd = addDays(today, 1)
  const { searchParams } = new URL(req.url)
  const division = getRequestDivision(user, searchParams.get('division'))
  const scopedStudentWhere = { ...visibleStudentWhere, division }
  const scopedGroupWhere = { ...visibleClassGroupWhere, division }
  const scopedMakeupGroupWhere = { ...makeupEligibleClassGroupWhere, division }
  const scopedLessonWhere = { division }

  const [
    totalStudents,
    lastMonthStudents,
    monthlyClassLessons,
    todayClassLessons,
    activityLogs,
    activeGroups,
    waitingGroups,
    renewalWarnings,
    pendingMakeups,
    monthlyDeducted,
    unpublishedPapers,
    unreadParentComments,
    unreadPerformanceComments,
    masteredCount,
    totalQuestionsCount,
    performancePostsToday,
    monthAttendance,
    parentMessages,
    teacherAppointmentLogs,
    pendingIntensiveAppointments,
    pendingIntensiveReviews,
  ] = await Promise.all([
    prisma.student.count({ where: { status: 'ACTIVE', division } }),
    prisma.student.count({ where: { status: 'ACTIVE', createdAt: { lt: monthStart }, division } }),
    prisma.classLesson.findMany({
      where: {
        ...scopedLessonWhere,
        lessonDate: { gte: monthStart, lt: monthEnd },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        group: scopedGroupWhere,
      },
      select: { startTime: true, endTime: true, lessonDate: true, group: { select: { lessonMinutes: true } } },
    }),
    prisma.classLesson.findMany({
      where: {
        ...scopedLessonWhere,
        lessonDate: { gte: today, lt: todayEnd },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        group: scopedGroupWhere,
      },
      include: {
        teacher: { select: { name: true } },
        group: {
          include: {
            course: true,
            room: true,
            teacher: { select: { name: true } },
            enrollments: { where: activeEnrollmentWhere, select: { id: true } },
          },
        },
        attendances: { select: { studentId: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.activityLog.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        detail: true,
        entityType: true,
        createdAt: true,
        user: { select: { name: true } },
        teacher: { select: { name: true } },
      },
    }),
    prisma.classGroup.count({ where: { status: 'ACTIVE', course: { isActive: true }, division } }),
    prisma.classGroup.count({ where: { status: 'WAITING', course: { isActive: true }, division } }),
    prisma.enrollment.count({ where: { remainHours: { lte: 5 }, totalHours: { gt: 0 }, ...activeEnrollmentWhere, student: scopedStudentWhere } }),
    prisma.makeupRequest.count({
      where: {
        status: 'PENDING',
        student: scopedStudentWhere,
        attendance: { lesson: { group: scopedMakeupGroupWhere } },
      },
    }),
    prisma.attendance.aggregate({
      _sum: { hoursDeducted: true },
      where: {
        hoursDeducted: { gt: 0 },
        student: scopedStudentWhere,
        lesson: { lessonDate: { gte: monthStart, lt: monthEnd }, group: scopedGroupWhere },
      },
    }),
    prisma.examPaper.count({ where: { status: 'DRAFT', student: scopedStudentWhere } }),
    prisma.paperComment.count({ where: { isRead: false, author: { role: 'parent' }, paper: { student: scopedStudentWhere } } }),
    prisma.postComment.count({ where: { isRead: false, author: { role: 'parent' }, post: { deletedAt: null, student: scopedStudentWhere } } }),
    prisma.paperQuestion.count({ where: { mastery: 'MASTERED', paper: { paperDate: { gte: monthStart, lt: monthEnd }, student: scopedStudentWhere } } }),
    prisma.paperQuestion.count({ where: { paper: { paperDate: { gte: monthStart, lt: monthEnd }, student: scopedStudentWhere } } }),
    prisma.performancePost.count({ where: { createdAt: { gte: today, lt: todayEnd }, deletedAt: null, student: scopedStudentWhere } }),
    prisma.classLesson.findMany({
      where: {
        ...scopedLessonWhere,
        lessonDate: { gte: monthStart, lt: monthEnd },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        group: scopedGroupWhere,
        attendances: { some: { hoursDeducted: { gt: 0 } } },
      },
      select: {
        teacherId: true,
        teacher: { select: { name: true } },
        group: { select: { teacherId: true, teacher: { select: { name: true } } } },
        attendances: { where: { hoursDeducted: { gt: 0 } }, select: { hoursDeducted: true, studentId: true } },
      },
    }),
    prisma.parentMessage.findMany({
      where: { student: { division } },
      select: {
        status: true,
        replies: {
          select: {
            role: true,
            createdAt: true,
            isReadByParent: true,
            isReadByTeacher: true,
          },
        },
      },
    }),
    prisma.activityLog.findMany({
      where: {
        entityType: 'ClassLesson',
        action: { in: ['INTENSIVE_LESSON_CREATE', 'INTENSIVE_LESSON_BACKFILL_CREATE'] },
        teacher: { division },
      },
      select: {
        entityId: true,
        action: true,
        createdAt: true,
        teacher: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.classLesson.count({
      where: {
        division,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        intensiveReviewStatus: 'DRAFT',
        attendanceSubmittedAt: null,
        group: { ...scopedGroupWhere, intensiveMode: 'INTENSIVE' },
      },
    }),
    prisma.intensiveLessonReview.count({
      where: {
        status: 'PENDING',
        lesson: {
          division,
          group: { ...scopedGroupWhere, intensiveMode: 'INTENSIVE' },
        },
      },
    }),
  ])

  const appointmentLessonIds = teacherAppointmentLogs
    .map((log) => log.entityId)
    .filter((id): id is string => Boolean(id))
  const appointmentLessons = appointmentLessonIds.length
    ? await prisma.classLesson.findMany({
      where: {
        id: { in: appointmentLessonIds },
        division,
        group: { ...scopedGroupWhere, intensiveMode: 'INTENSIVE' },
      },
      select: {
        id: true,
        groupId: true,
        lessonDate: true,
        startTime: true,
        endTime: true,
        subject: true,
        intensiveReviewStatus: true,
        group: { select: { name: true, teachingType: true } },
        lessonStudents: {
          select: { student: { select: { name: true } } },
        },
      },
    })
    : []
  const appointmentLessonMap = new Map(appointmentLessons.map((lesson) => [lesson.id, lesson]))
  const intensiveAppointments = teacherAppointmentLogs.flatMap((log) => {
    if (!log.entityId) return []
    const lesson = appointmentLessonMap.get(log.entityId)
    if (!lesson) return []
    return [{
      id: lesson.id,
      groupId: lesson.groupId,
      groupName: lesson.group.name,
      teacher: log.teacher?.name ?? '未知教师',
      subject: lesson.subject ?? '未设置学科',
      students: lesson.lessonStudents.map((item) => item.student.name),
      lessonDate: lesson.lessonDate.toISOString(),
      time: `${lesson.startTime}-${lesson.endTime}`,
      createdAt: log.createdAt.toISOString(),
      createdTimeAgo: formatTimeAgo(log.createdAt),
      isHistorical: log.action === 'INTENSIVE_LESSON_BACKFILL_CREATE',
      teachingType: lesson.group.teachingType || 'ONE_ON_ONE',
      teachingTypeLabel: intensiveTeachingTypeLabel(lesson.group.teachingType),
      reviewStatus: lesson.intensiveReviewStatus,
    }]
  })

  const classLessonHours = monthlyClassLessons.reduce((sum, lesson) => {
    if (lesson.group.lessonMinutes > 0) return sum + lesson.group.lessonMinutes / 60
    return sum + hoursBetween(combineLessonDateTime(lesson.lessonDate, lesson.startTime), combineLessonDateTime(lesson.lessonDate, lesson.endTime))
  }, 0)
  const monthlyScheduledHours = roundHours(classLessonHours)
  const monthlyDeductedHours = roundHours(monthlyDeducted._sum.hoursDeducted ?? 0)

  const teacherWorkloadMap = new Map<string, { name: string; hours: number; students: Set<string> }>()
  for (const lesson of monthAttendance) {
    const teacherId = lesson.teacherId ?? lesson.group.teacherId
    if (!teacherId) continue
    const existing = teacherWorkloadMap.get(teacherId)
    const target = existing ?? {
      name: lesson.teacher?.name ?? lesson.group.teacher?.name ?? '未知教师',
      hours: 0,
      students: new Set<string>(),
    }
    target.hours += lesson.attendances.reduce((sum, attendance) => sum + (attendance.hoursDeducted || 0), 0)
    lesson.attendances.forEach((attendance) => target.students.add(attendance.studentId))
    teacherWorkloadMap.set(teacherId, target)
  }
  const teacherWorkload = [...teacherWorkloadMap.values()]
    .map((item) => ({ name: item.name, hours: roundHours(item.hours), students: item.students.size }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8)

  const classLessonSchedules = todayClassLessons.map((lesson) => {
    const start = combineLessonDateTime(lesson.lessonDate, lesson.startTime)
    const end = combineLessonDateTime(lesson.lessonDate, lesson.endTime)
    const attendanceSubmitted = hasSubmittedLessonAttendance({
      attendanceSubmittedAt: lesson.attendanceSubmittedAt,
      status: lesson.status,
      attendances: lesson.attendances,
    })
    return {
      id: lesson.id,
      source: 'classLesson' as const,
      time: `${lesson.startTime}-${lesson.endTime}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      courseName: lesson.group.name,
      teacher: lesson.teacher?.name ?? lesson.group.teacher.name,
      room: lesson.group.room?.name ?? '-',
      subject: lesson.subject ?? lesson.group.course.subject,
      students: lesson.group.enrollments.length,
      statusLabel: getStatusLabel(start, end, attendanceSubmitted),
    }
  })

  const minuteOfDay = (item: { time: string; startTime: string }) => {
    const m = item.time.match(/^(\d{1,2}):(\d{2})/)
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
    const d = new Date(item.startTime)
    return d.getHours() * 60 + d.getMinutes()
  }
  const schedules = classLessonSchedules.sort((a, b) => minuteOfDay(a) - minuteOfDay(b))
  const todayLessonsCompleted = schedules.filter((item) => item.statusLabel === '已完成').length
  const todayLessonsPendingAttendance = schedules.filter((item) => item.statusLabel === '待考勤').length
  const unreadComments = unreadParentComments + unreadPerformanceComments
  const messageWorkflow = summarizeParentMessageWorkflow(parentMessages)
  // Keep the headline total identical to the visible exception-center rows.
  // Mixing hidden counters here previously made the top card disagree with
  // the detailed list and made the number impossible for admins to explain.
  const pendingTasks = messageWorkflow.pendingTeacherReplies
    + pendingIntensiveAppointments
    + pendingIntensiveReviews
    + todayLessonsPendingAttendance
    + renewalWarnings
    + pendingMakeups
    + unpublishedPapers
    + messageWorkflow.pendingParentReads
  const pendingTasksUrgent = messageWorkflow.pendingTeacherReplies
    + pendingIntensiveReviews
    + todayLessonsPendingAttendance
  const growth = lastMonthStudents > 0 ? ((totalStudents - lastMonthStudents) / lastMonthStudents) * 100 : 0

  return NextResponse.json({
    metrics: {
      activeStudents: totalStudents,
      studentGrowth: Number(growth.toFixed(1)),
      monthlyScheduledHours,
      monthlyDeductedHours,
      hoursProgress: monthlyScheduledHours > 0 ? Math.min(100, Math.round((monthlyDeductedHours / monthlyScheduledHours) * 100)) : 0,
      todayLessons: schedules.length,
      todayLessonsCompleted,
      todayLessonsPendingAttendance,
      pendingTasks,
      pendingTasksUrgent,
      activeGroups,
      waitingGroups,
      renewalWarnings,
      pendingMakeups,
      pendingIntensiveAppointments,
      pendingIntensiveReviews,
      unpublishedPapers,
      unreadParentComments,
      unreadPerformanceComments,
      unreadComments,
      pendingTeacherReplies: messageWorkflow.pendingTeacherReplies,
      pendingParentReads: messageWorkflow.pendingParentReads,
      masteredRate: totalQuestionsCount > 0 ? Math.round((masteredCount / totalQuestionsCount) * 100) : 0,
      performancePostsToday,
    },
    growthData: {
      months: [],
      newStudents: [],
      totalStudents: [],
      classHours: [],
    },
    schedules,
    operatingHighlights: [
      { label: '今日待考勤', value: todayLessonsPendingAttendance, tone: 'orange', href: '/attendance' },
      { label: '课时不足', value: renewalWarnings, tone: 'red', href: '/students?filter=lowHours' },
      { label: '未推送试卷', value: unpublishedPapers, tone: 'blue', href: '/grades' },
      { label: '家长未读沟通', value: unreadComments, tone: 'purple', href: '/communications' },
    ],
    workloads: teacherWorkload,
    intensiveAppointments,
    logs: activityLogs.map((log) => ({
      id: log.id,
      user: log.user?.name ?? log.teacher?.name ?? '系统',
      action: log.action,
      target: log.detail ?? log.entityType ?? '',
      time: formatTimeAgo(log.createdAt),
    })),
  })
})
