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
import { getParentMessageWorkflowState, summarizeParentMessageWorkflow } from '@/lib/parent-message-workflow'
import { intensiveTeachingTypeLabel } from '@/lib/intensive-class'
import { hasSubmittedLessonAttendance } from '@/lib/attendance-submission'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { dateRangeDays, getLocalDayRange, localDateKey } from '@/lib/date/local-day'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { presentDashboardUpcomingLesson, selectNextScheduledLessonDay, shouldShowWeekendNextLessons } from '@/lib/dashboard-upcoming-lessons'

export const dynamic = 'force-dynamic'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000)
}

function roundHours(value: number) {
  return Number(value.toFixed(2))
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
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const { searchParams } = new URL(req.url)
  const division = getRequestDivision(user, searchParams.get('division'))
  const selectedTerm = await resolveAdminTermScope(prisma, division, req)
  const selectedTermKind = selectedTerm
    ? (await prisma.academicTerm.findUnique({ where: { id: selectedTerm.id }, select: { kind: true } }))?.kind
    : null
  const scopedTermId = selectedTerm?.id || '__NO_SELECTED_TERM__'
  const termStudentWhere = { termMemberships: { some: { termId: scopedTermId } } }
  const termGroupWhere = { termId: scopedTermId }
  const scopedStudentWhere = { ...visibleStudentWhere, division, ...termStudentWhere }
  const scopedGroupWhere = { ...visibleClassGroupWhere, division, ...termGroupWhere }
  const scopedMakeupGroupWhere = { ...makeupEligibleClassGroupWhere, division, ...termGroupWhere }
  const scopedLessonWhere = { division, group: { termId: scopedTermId } }

  const [
    totalStudents,
    lastMonthStudents,
    monthlyClassHours,
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
    prisma.student.count({ where: { ...scopedStudentWhere, status: 'ACTIVE' } }),
    prisma.student.count({ where: { ...scopedStudentWhere, status: 'ACTIVE', createdAt: { lt: monthStart } } }),
    prisma.$queryRaw<Array<{ year: number; monthIndex: number; hours: number }>>`
      SELECT
        EXTRACT(YEAR FROM lesson."lessonDate")::int AS "year",
        (EXTRACT(MONTH FROM lesson."lessonDate")::int - 1) AS "monthIndex",
        COALESCE(SUM(
          CASE
            WHEN class_group."lessonMinutes" > 0
              THEN class_group."lessonMinutes"::double precision / 60.0
            ELSE GREATEST(
              0.0,
              EXTRACT(EPOCH FROM (lesson."endTime"::time - lesson."startTime"::time)) / 3600.0
            )
          END
        ), 0)::double precision AS "hours"
      FROM "ClassLesson" AS lesson
      INNER JOIN "ClassGroup" AS class_group ON class_group."id" = lesson."groupId"
      INNER JOIN "Course" AS course ON course."id" = class_group."courseId"
      WHERE lesson."division" = ${division}
        AND lesson."lessonDate" >= ${sixMonthsAgo}
        AND lesson."lessonDate" < ${monthEnd}
        AND lesson."status" NOT IN ('CANCELLED', 'POSTPONED')
        AND class_group."termId" = ${scopedTermId}
        AND class_group."division" = ${division}
        AND class_group."status" <> 'ARCHIVED'
        AND class_group."deletedAt" IS NULL
        AND course."isActive" = TRUE
        AND course."deletedAt" IS NULL
      GROUP BY 1, 2
    `,
    prisma.classLesson.findMany({
      where: {
        ...scopedLessonWhere,
        lessonDate: { gte: today, lt: todayEnd },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        group: scopedGroupWhere,
      },
      include: {
        teacher: { select: { name: true, gender: true, avatar: true } },
        group: {
          include: {
            course: true,
            room: true,
            teacher: { select: { name: true, gender: true, avatar: true } },
            enrollments: { where: activeEnrollmentWhere, select: { studentId: true, subjects: true } },
          },
        },
        attendances: { select: { studentId: true } },
        lessonStudents: { select: { studentId: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.activityLog.findMany({
      where: selectedTerm
        ? {
            createdAt: {
              gte: startOfDay(selectedTerm.startDate),
              lt: addDays(startOfDay(selectedTerm.endDate), 1),
            },
          }
        : { id: '__NO_SELECTED_TERM__' },
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
    prisma.classGroup.count({ where: { ...scopedGroupWhere, status: 'ACTIVE', course: { isActive: true } } }),
    prisma.classGroup.count({ where: { ...scopedGroupWhere, status: 'WAITING', course: { isActive: true } } }),
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
    prisma.examPaper.count({ where: { termId: scopedTermId, status: 'DRAFT', student: scopedStudentWhere } }),
    prisma.paperComment.count({ where: { isRead: false, author: { role: 'parent' }, paper: { termId: scopedTermId, student: scopedStudentWhere } } }),
    prisma.postComment.count({ where: { isRead: false, author: { role: 'parent' }, post: { termId: scopedTermId, deletedAt: null, student: scopedStudentWhere } } }),
    prisma.paperQuestion.count({ where: { mastery: 'MASTERED', paper: { termId: scopedTermId, paperDate: { gte: monthStart, lt: monthEnd }, student: scopedStudentWhere } } }),
    prisma.paperQuestion.count({ where: { paper: { termId: scopedTermId, paperDate: { gte: monthStart, lt: monthEnd }, student: scopedStudentWhere } } }),
    prisma.performancePost.count({ where: { termId: scopedTermId, createdAt: { gte: today, lt: todayEnd }, deletedAt: null, student: scopedStudentWhere } }),
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
      where: { student: scopedStudentWhere },
      select: {
        status: true,
        teacherId: true,
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

  const classHoursByMonth = new Map(
    monthlyClassHours.map((row) => [`${row.year}-${row.monthIndex}`, row.hours]),
  )
  const monthlyScheduledHours = roundHours(classHoursByMonth.get(`${now.getFullYear()}-${now.getMonth()}`) ?? 0)
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

  // 统计班级在读带班学员（确保已排班学员的教师被准确计入带班名师）
  const activeClassGroups = await prisma.classGroup.findMany({
    where: {
      ...scopedGroupWhere,
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: {
      teacherId: true,
      enrollments: {
        where: { status: 'ACTIVE', deletedAt: null, student: { status: 'ACTIVE', deletedAt: null } },
        select: { studentId: true },
      },
    },
  })
  for (const group of activeClassGroups) {
    if (!group.teacherId) continue
    const target = teacherWorkloadMap.get(group.teacherId) ?? {
      name: '',
      hours: 0,
      students: new Set<string>(),
    }
    group.enrollments.forEach((e) => target.students.add(e.studentId))
    teacherWorkloadMap.set(group.teacherId, target)
  }
  const teacherWorkload = [...teacherWorkloadMap.values()]
    .map((item) => ({ name: item.name, hours: roundHours(item.hours), students: item.students.size }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8)

  // ── 今日教师考勤/反馈完成情况（按教师聚合，管理者一目了然） ──
  const todayLessonIds = todayClassLessons.map((lesson) => lesson.id)
  const [todayFeedbackRows, studentCreatedAtRows] = await Promise.all([
    todayLessonIds.length
      ? prisma.classroomFeedback.findMany({
          where: { classLessonId: { in: todayLessonIds } },
          select: { classLessonId: true, teacherId: true },
        })
      : Promise.resolve([] as Array<{ classLessonId: string | null; teacherId: string }>),
    prisma.student.findMany({
      where: { ...scopedStudentWhere, status: 'ACTIVE' },
      select: { createdAt: true },
    }),
  ])

  const teacherComplianceMap = new Map<string, { teacherId: string; name: string; gender: string | null; avatar: string | null; todayLessons: number; attendanceDone: number; pendingAttendance: number; feedbackDone: number; pendingFeedback: number }>()
  for (const lesson of todayClassLessons) {
    const teacherId = lesson.teacherId ?? lesson.group.teacherId
    if (!teacherId) continue
    const name = lesson.teacher?.name ?? lesson.group.teacher.name ?? '未知教师'
    const gender = lesson.teacher?.gender ?? lesson.group.teacher.gender ?? null
    const avatar = lesson.teacher?.avatar ?? lesson.group.teacher.avatar ?? null
    const entry = teacherComplianceMap.get(teacherId) ?? { teacherId, name, gender, avatar, todayLessons: 0, attendanceDone: 0, pendingAttendance: 0, feedbackDone: 0, pendingFeedback: 0 }
    entry.todayLessons += 1
    if (hasSubmittedLessonAttendance({ attendanceSubmittedAt: lesson.attendanceSubmittedAt, status: lesson.status, attendances: lesson.attendances })) {
      entry.attendanceDone += 1
    } else {
      entry.pendingAttendance += 1
    }
    teacherComplianceMap.set(teacherId, entry)
  }
  const feedbackLessonIds = new Set(todayFeedbackRows.map((row) => row.classLessonId).filter((id): id is string => Boolean(id)))
  for (const lesson of todayClassLessons) {
    const teacherId = lesson.teacherId ?? lesson.group.teacherId
    if (!teacherId) continue
    const entry = teacherComplianceMap.get(teacherId)
    if (!entry) continue
    if (feedbackLessonIds.has(lesson.id)) entry.feedbackDone += 1
    else entry.pendingFeedback += 1
  }
  const teacherCompliance = [...teacherComplianceMap.values()]
    .map((item) => ({ ...item }))
    .sort((a, b) => (b.pendingAttendance + b.pendingFeedback) - (a.pendingAttendance + a.pendingFeedback) || b.todayLessons - a.todayLessons)

  // ── 在读学员年级分布透视 ──
  const rawGradeGroups = await prisma.student.groupBy({
    by: ['grade'],
    _count: { id: true },
    where: { ...scopedStudentWhere, status: 'ACTIVE' },
  })
  const totalActiveStudents = rawGradeGroups.reduce((sum, g) => sum + g._count.id, 0)
  const GRADE_ORDER = ['初一', '初二', '初三', '高一', '高二', '高三']
  const studentGrades = rawGradeGroups
    .map((g) => ({
      grade: g.grade || '未分年级',
      count: g._count.id,
      percentage: totalActiveStudents > 0 ? Math.round((g._count.id / totalActiveStudents) * 100) : 0,
    }))
    .sort((a, b) => {
      const idxA = GRADE_ORDER.indexOf(a.grade)
      const idxB = GRADE_ORDER.indexOf(b.grade)
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
    })

  // ── 校区执教教师实况（排除管理督导，聚焦一线授课名师带班与待办） ──
  const allActiveTeachers = await prisma.teacher.findMany({
    where: {
      status: 'ACTIVE',
      tierLevel: { not: 'MANAGER' },
    },
    select: {
      id: true,
      name: true,
      gender: true,
      avatar: true,
      tierLevel: true,
      subjects: true,
    },
  })
  const teacherPendingRepliesMap = new Map<string, number>()
  for (const msg of parentMessages) {
    if (msg.teacherId) {
      const state = getParentMessageWorkflowState(msg)
      if (state.pendingTeacherReply) {
        teacherPendingRepliesMap.set(msg.teacherId, (teacherPendingRepliesMap.get(msg.teacherId) || 0) + 1)
      }
    }
  }
  const teachersSummary = allActiveTeachers.map((t) => {
    const comp = teacherComplianceMap.get(t.id)
    const workload = teacherWorkloadMap.get(t.id)
    const pendingReplies = teacherPendingRepliesMap.get(t.id) || 0
    return {
      teacherId: t.id,
      name: t.name,
      gender: t.gender,
      avatar: t.avatar,
      tierLevel: t.tierLevel,
      subjects: t.subjects,
      activeStudents: workload?.students.size || 0,
      monthlyHours: roundHours(workload?.hours || 0),
      todayLessons: comp?.todayLessons || 0,
      pendingAttendance: comp?.pendingAttendance || 0,
      pendingFeedback: comp?.pendingFeedback || 0,
      pendingReplies,
    }
  }).sort((a, b) => {
    const pendingA = a.pendingReplies + a.pendingAttendance + a.pendingFeedback
    const pendingB = b.pendingReplies + b.pendingAttendance + b.pendingFeedback
    if (pendingB !== pendingA) return pendingB - pendingA
    if (b.todayLessons !== a.todayLessons) return b.todayLessons - a.todayLessons
    return b.activeStudents - a.activeStudents
  })

  // ── 近 6 个月学员增长 + 课时趋势（图表数据） ──
  const monthBuckets: Array<{ key: string; label: string }> = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthBuckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: `${d.getMonth() + 1}月` })
  }
  const newStudentsByMonth = new Map<string, number>()
  for (const row of studentCreatedAtRows) {
    const key = `${row.createdAt.getFullYear()}-${row.createdAt.getMonth()}`
    newStudentsByMonth.set(key, (newStudentsByMonth.get(key) || 0) + 1)
  }
  let studentAccumulator = 0
  const growthData = {
    months: monthBuckets.map((bucket) => bucket.label),
    newStudents: monthBuckets.map((bucket) => newStudentsByMonth.get(bucket.key) || 0),
    totalStudents: monthBuckets.map((bucket) => {
      studentAccumulator += newStudentsByMonth.get(bucket.key) || 0
      return studentAccumulator
    }),
    classHours: monthBuckets.map((bucket) => roundHours(classHoursByMonth.get(bucket.key) || 0)),
  }

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
      students: resolveSubjectLessonStudentIds(
        lesson.lessonStudents.map((student) => student.studentId),
        lesson.group.enrollments.map((enrollment) => ({
          studentId: enrollment.studentId,
          subjects: enrollment.subjects,
        })),
        lesson.subject ?? lesson.group.course.subject,
        lesson.lessonDate,
      ).length,
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
  let weekendNextLessons: Array<{
    id: string
    groupId: string
    groupName: string
    subject: string
    teacher: string
    room: string
    studentCount: number
    date: string
    startTime: string
    endTime: string
  }> = []
  if (shouldShowWeekendNextLessons(
    selectedTerm ? { status: selectedTerm.status, kind: selectedTermKind } : null,
    schedules.length,
  )) {
    const todayKey = localDateKey(today)
    const horizon = dateRangeDays(todayKey, 15).at(-1) || todayKey
    const { start: upcomingStart } = getLocalDayRange(dateRangeDays(todayKey, 2)[1])
    const { end: upcomingEnd } = getLocalDayRange(horizon)
    const upcomingRows = await prisma.classLesson.findMany({
      where: {
        ...scopedLessonWhere,
        deletedAt: null,
        lessonDate: { gte: upcomingStart, lt: upcomingEnd },
        status: 'SCHEDULED',
        group: { ...scopedGroupWhere, deletedAt: null, status: { not: 'ARCHIVED' } },
      },
      include: {
        teacher: { select: { id: true, name: true } },
        group: {
          include: {
            course: { select: { subject: true } },
            room: { select: { name: true } },
            teacher: { select: { id: true, name: true } },
            teacherAssignments: { select: { teacherId: true, subject: true, teacher: { select: { name: true } } } },
            enrollments: { where: activeEnrollmentWhere, select: { studentId: true, subjects: true } },
          },
        },
        lessonStudents: { select: { studentId: true } },
      },
      orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
      take: 300,
    })
    if (upcomingRows.length) {
      const nextDay = selectNextScheduledLessonDay(upcomingRows, todayKey)
      if (nextDay.date) {
        weekendNextLessons = nextDay.lessons.map((lesson) =>
          presentDashboardUpcomingLesson(lesson, nextDay.date!),
        )
      }
    }
  }
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
    growthData,
    schedules,
    teacherCompliance,
    weekendNextLessons,
    operatingHighlights: [
      { label: '今日待考勤', value: todayLessonsPendingAttendance, tone: 'orange', href: '/attendance' },
      { label: '未推送试卷', value: unpublishedPapers, tone: 'blue', href: '/grades' },
      { label: '家长未读沟通', value: unreadComments, tone: 'purple', href: '/communications' },
    ],
    workloads: teacherWorkload,
    intensiveAppointments,
    studentGrades,
    teachersSummary,
    logs: activityLogs.map((log) => ({
      id: log.id,
      user: log.user?.name ?? log.teacher?.name ?? '系统',
      action: log.action,
      target: log.detail ?? log.entityType ?? '',
      time: formatTimeAgo(log.createdAt),
    })),
  })
})
