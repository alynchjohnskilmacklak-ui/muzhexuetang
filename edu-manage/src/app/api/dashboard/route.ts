import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import {
  activeEnrollmentWhere,
  visibleClassGroupWhere,
  visibleStudentWhere,
} from '@/lib/business-visibility'

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

function getStatusLabel(start: Date, end: Date, attendanceSubmittedAt?: Date | null) {
  const now = new Date()
  if (attendanceSubmittedAt) return '已完成' as const
  if (now < start) return '待上课' as const
  if (now >= start && now <= end) return '上课中' as const
  return '待考勤' as const
}

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const today = startOfDay(now)
  const todayEnd = addDays(today, 1)

  const [
    totalStudents,
    lastMonthStudents,
    monthlySchedules,
    monthlyClassLessons,
    todaySchedules,
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
  ] = await Promise.all([
    prisma.student.count({ where: { status: 'ACTIVE' } }),
    prisma.student.count({ where: { status: 'ACTIVE', createdAt: { lt: monthStart } } }),
    prisma.schedule.findMany({
      where: { startTime: { gte: monthStart, lt: monthEnd }, status: { not: 'cancelled' }, course: { isActive: true } },
      select: { startTime: true, endTime: true },
    }),
    prisma.classLesson.findMany({
      where: {
        lessonDate: { gte: monthStart, lt: monthEnd },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        group: visibleClassGroupWhere,
      },
      select: { startTime: true, endTime: true, lessonDate: true, group: { select: { lessonMinutes: true } } },
    }),
    prisma.schedule.findMany({
      where: { startTime: { gte: today, lt: todayEnd }, status: { not: 'cancelled' }, course: { isActive: true } },
      include: {
        teacher: true,
        course: true,
        room: true,
        students: { where: { student: visibleStudentWhere } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.classLesson.findMany({
      where: {
        lessonDate: { gte: today, lt: todayEnd },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        group: visibleClassGroupWhere,
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
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.activityLog.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { user: true, teacher: true },
    }),
    prisma.classGroup.count({ where: { status: 'ACTIVE', course: { isActive: true } } }),
    prisma.classGroup.count({ where: { status: 'WAITING', course: { isActive: true } } }),
    prisma.enrollment.count({ where: { remainHours: { lte: 5 }, totalHours: { gt: 0 }, ...activeEnrollmentWhere } }),
    prisma.makeupRequest.count({ where: { status: 'PENDING', student: visibleStudentWhere, attendance: { lesson: { group: visibleClassGroupWhere } } } }),
    prisma.attendance.aggregate({
      _sum: { hoursDeducted: true },
      where: {
        hoursDeducted: { gt: 0 },
        student: visibleStudentWhere,
        lesson: { lessonDate: { gte: monthStart, lt: monthEnd }, group: visibleClassGroupWhere },
      },
    }),
    prisma.examPaper.count({ where: { status: 'DRAFT', student: visibleStudentWhere } }),
    prisma.paperComment.count({ where: { isRead: false, author: { role: 'parent' }, paper: { student: visibleStudentWhere } } }),
    prisma.postComment.count({ where: { isRead: false, author: { role: 'parent' }, post: { deletedAt: null, student: visibleStudentWhere } } }),
    prisma.paperQuestion.count({ where: { mastery: 'MASTERED', paper: { paperDate: { gte: monthStart, lt: monthEnd }, student: visibleStudentWhere } } }),
    prisma.paperQuestion.count({ where: { paper: { paperDate: { gte: monthStart, lt: monthEnd }, student: visibleStudentWhere } } }),
    prisma.performancePost.count({ where: { createdAt: { gte: today, lt: todayEnd }, deletedAt: null, student: visibleStudentWhere } }),
    prisma.classLesson.findMany({
      where: {
        lessonDate: { gte: monthStart, lt: monthEnd },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        group: visibleClassGroupWhere,
        attendances: { some: { hoursDeducted: { gt: 0 } } },
      },
      select: {
        teacherId: true,
        teacher: { select: { name: true } },
        group: { select: { teacherId: true, teacher: { select: { name: true } } } },
        attendances: { where: { hoursDeducted: { gt: 0 } }, select: { hoursDeducted: true, studentId: true } },
      },
    }),
  ])

  const scheduleHours = monthlySchedules.reduce((sum, schedule) => sum + hoursBetween(schedule.startTime, schedule.endTime), 0)
  const classLessonHours = monthlyClassLessons.reduce((sum, lesson) => {
    if (lesson.group.lessonMinutes > 0) return sum + lesson.group.lessonMinutes / 60
    return sum + hoursBetween(combineLessonDateTime(lesson.lessonDate, lesson.startTime), combineLessonDateTime(lesson.lessonDate, lesson.endTime))
  }, 0)
  const monthlyScheduledHours = roundHours(scheduleHours + classLessonHours)
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
      statusLabel: getStatusLabel(start, end, lesson.attendanceSubmittedAt),
    }
  })

  const legacySchedules = todaySchedules.map((schedule) => ({
    id: schedule.id,
    source: 'schedule' as const,
    time: `${formatTime(schedule.startTime)}-${formatTime(schedule.endTime)}`,
    startTime: schedule.startTime.toISOString(),
    endTime: schedule.endTime.toISOString(),
    courseName: schedule.title || schedule.course.name,
    teacher: schedule.teacher.name,
    room: schedule.room?.name ?? schedule.roomId ?? '-',
    subject: schedule.course.subject,
    students: schedule.students.length,
    statusLabel: getStatusLabel(schedule.startTime, schedule.endTime, schedule.attendanceSubmittedAt),
  }))

  const minuteOfDay = (item: { time: string; startTime: string }) => {
    const m = item.time.match(/^(\d{1,2}):(\d{2})/)
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
    const d = new Date(item.startTime)
    return d.getHours() * 60 + d.getMinutes()
  }
  const schedules = [...classLessonSchedules, ...legacySchedules].sort((a, b) => minuteOfDay(a) - minuteOfDay(b))
  const todayLessonsCompleted = schedules.filter((item) => item.statusLabel === '已完成').length
  const todayLessonsPendingAttendance = schedules.filter((item) => item.statusLabel === '待考勤').length
  const unreadComments = unreadParentComments + unreadPerformanceComments
  const pendingTasks = unpublishedPapers + unreadComments + pendingMakeups + renewalWarnings
  const pendingTasksUrgent = pendingMakeups + renewalWarnings
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
      unpublishedPapers,
      unreadParentComments,
      unreadPerformanceComments,
      unreadComments,
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
    logs: activityLogs.map((log) => ({
      id: log.id,
      user: log.user?.name ?? log.teacher?.name ?? '系统',
      action: log.action,
      target: log.detail ?? log.entityType ?? '',
      time: formatTimeAgo(log.createdAt),
    })),
  })
})
