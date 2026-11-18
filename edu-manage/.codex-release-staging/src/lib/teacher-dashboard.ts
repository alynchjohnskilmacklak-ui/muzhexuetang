import { getRequestPrisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { teacherLessonScopeWhere, teacherStudentWhere, todayRange, weekRange } from '@/lib/teacher-portal'
import { visibleStudentWhere } from '@/lib/business-visibility'
import { minutesToHours, roundHours } from '@/lib/hours'
import { buildLatestFeedbackDateByStudent } from '@/lib/teacher-feedback-freshness'
import { hasSubmittedLessonAttendance } from '@/lib/attendance-submission'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { localDateColumnValue, todayLocal } from '@/lib/date/local-day'
import { attendanceKey, isoWeekday } from '@/lib/study-hall/domain'

function atTime(date: Date, time: string) {
  const [hour, minute] = time.split(':').map(Number)
  const value = new Date(date)
  value.setHours(hour || 0, minute || 0, 0, 0)
  return value
}

function lessonStatusLabel(
  lesson: { lessonDate: Date; startTime: string; endTime: string; status: string },
  attendanceSubmitted: boolean,
  now = new Date(),
) {
  const start = atTime(lesson.lessonDate, lesson.startTime)
  const end = atTime(lesson.lessonDate, lesson.endTime)

  if (lesson.status === 'COMPLETED' && attendanceSubmitted) return { label: '已完成', tone: 'green' }
  if (attendanceSubmitted) return { label: '已考勤', tone: 'green' }
  if (now < start) return { label: '待上课', tone: 'blue' }
  if (now >= start && now <= end) return { label: '上课中', tone: 'orange' }
  return { label: '待考勤', tone: 'red' }
}

function percent(done: number, total: number) {
  if (total <= 0) return 0
  return Math.round((done / total) * 100)
}

function daysSince(date?: Date | null) {
  if (!date) return 999
  return Math.floor((Date.now() - date.getTime()) / 86400000)
}

export async function getTeacherDashboardData(teacherId: string, prismaClient?: PrismaClient, teacherUserId?: string) {
  const prisma = prismaClient ?? await getRequestPrisma()
  const now = new Date()
  const { start: today, end: todayEnd } = todayRange(now)
  const { start: weekStart, end: weekEnd } = weekRange(now)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { division: true, user: { select: { id: true } } } })
  const activeTerm = teacher ? await getActiveAcademicTerm(prisma, teacher.division) : null
  const termId = activeTerm?.id || '__NO_ACTIVE_TERM__'
  const lessonWhere = await teacherLessonScopeWhere(prisma, teacherId, termId)
  const studentWhere = teacherStudentWhere(teacherId, termId)
  const todayKey = todayLocal()
  const todayDate = localDateColumnValue(todayKey)
  const todayWeekday = isoWeekday(todayKey)
  const resolvedTeacherUserId = teacherUserId || teacher?.user?.id

  const [
    todayLessons,
    weekLessons,
    monthLessons,
    students,
    weekPapers,
    recentDraftPapers,
    unreadPaperComments,
    unreadPostComments,
    pendingLeaveRequests,
    todayPublishedFeedbacks,
    weekPublishedFeedbacks,
    weekTeacherMessages,
  ] = await Promise.all([
    prisma.classLesson.findMany({
      where: { ...lessonWhere, lessonDate: { gte: today, lt: todayEnd } },
      include: {
        group: {
          include: {
            course: true,
            room: true,
            enrollments: {
              where: { status: 'ACTIVE', student: visibleStudentWhere },
              include: { student: { select: { id: true, name: true, grade: true, school: true, membershipLevel: true } } },
            },
          },
        },
        attendances: true,
        lessonStudents: { select: { studentId: true } },
        classroomFeedbacks: { where: { teacherId, status: 'PUBLISHED' }, select: { id: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.classLesson.findMany({
      where: { ...lessonWhere, lessonDate: { gte: weekStart, lt: weekEnd } },
      include: {
        attendances: true,
        lessonStudents: { select: { studentId: true } },
        classroomFeedbacks: { where: { teacherId, status: 'PUBLISHED' }, select: { id: true } },
      },
    }),
    prisma.classLesson.findMany({
      where: { ...lessonWhere, lessonDate: { gte: monthStart } },
      select: { lessonDate: true, startTime: true, endTime: true, group: { select: { lessonMinutes: true } } },
    }),
    prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        name: true,
        grade: true,
        school: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          select: {
            status: true,
            totalHours: true,
            remainHours: true,
            enrolledAt: true,
          },
        },
        attendances: {
          where: { lesson: lessonWhere },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { status: true },
        },
        performancePosts: {
          where: { teacherId, termId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        examPapers: {
          where: { teacherId, termId, status: { not: 'DELETED' } },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            questions: { select: { mastery: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.examPaper.findMany({
      where: {
        teacherId,
        termId,
        status: { not: 'DELETED' },
        paperDate: { gte: weekStart, lt: weekEnd },
        student: visibleStudentWhere,
      },
      select: { status: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.examPaper.findMany({
      where: {
        teacherId,
        termId,
        status: 'DRAFT',
        student: visibleStudentWhere,
      },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.paperComment.count({ where: { isRead: false, author: { role: 'parent' }, paper: { teacherId, termId } } }),
    prisma.postComment.count({ where: { isRead: false, author: { role: 'parent' }, post: { teacherId, termId, deletedAt: null } } }),
    prisma.leaveRequest.findMany({
      where: {
        status: 'pending',
        student: studentWhere,
      },
      include: {
        student: { select: { id: true, name: true } },
        lesson: { select: { startTime: true, group: { select: { course: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    prisma.classroomFeedback.findMany({
      where: { teacherId, termId, status: 'PUBLISHED', createdAt: { gte: today, lt: todayEnd } },
      select: { classLessonId: true, feedbackGroupId: true, studentIds: true },
    }),
    prisma.classroomFeedback.findMany({
      where: { teacherId, termId, status: 'PUBLISHED', createdAt: { gte: weekStart, lt: weekEnd } },
      select: {
        classLessonId: true,
        feedbackGroupId: true,
        createdAt: true,
        classLesson: { select: { groupId: true } },
      },
    }),
    prisma.teacherMessage.findMany({
      where: { teacherId, createdAt: { gte: weekStart, lt: weekEnd } },
      select: { id: true, readAt: true },
    }),
  ])

  const publishedClassroomFeedbacks = students.length
    ? await prisma.classroomFeedback.findMany({
        where: {
          teacherId,
          termId,
          status: 'PUBLISHED',
          studentIds: { hasSome: students.map((student) => student.id) },
        },
        select: {
          studentIds: true,
          createdAt: true,
        },
      })
    : []
  const latestFeedbackDateByStudent = buildLatestFeedbackDateByStudent(
    students,
    publishedClassroomFeedbacks,
  )

  const coveredByLesson = new Map<string, Set<string>>()
  const coveredByGroup = new Map<string, Set<string>>()
  for (const feedback of todayPublishedFeedbacks) {
    if (feedback.classLessonId) {
      const set = coveredByLesson.get(feedback.classLessonId) || new Set<string>()
      feedback.studentIds.forEach((studentId) => set.add(studentId))
      coveredByLesson.set(feedback.classLessonId, set)
    }
    if (feedback.feedbackGroupId) {
      const set = coveredByGroup.get(feedback.feedbackGroupId) || new Set<string>()
      feedback.studentIds.forEach((studentId) => set.add(studentId))
      coveredByGroup.set(feedback.feedbackGroupId, set)
    }
  }

  const coveredStudentIdsFor = (lesson: typeof todayLessons[number]) => {
    const covered = new Set<string>()
    coveredByGroup.get(lesson.groupId)?.forEach((studentId) => covered.add(studentId))
    coveredByLesson.get(lesson.id)?.forEach((studentId) => covered.add(studentId))
    return covered
  }

  const decoratedTodayLessons = todayLessons.map((lesson) => {
    const expectedStudentIds = lesson.group.intensiveMode === 'INTENSIVE'
      ? lesson.lessonStudents.map((student) => student.studentId)
      : lesson.group.enrollments.map((enrollment) => enrollment.student.id)
    const attendanceSubmitted = hasSubmittedLessonAttendance({
      attendanceSubmittedAt: lesson.attendanceSubmittedAt,
      status: lesson.status,
      attendances: lesson.attendances,
      expectedStudentIds,
    })
    const status = lessonStatusLabel(lesson, attendanceSubmitted, now)
    const covered = coveredStudentIdsFor(lesson)
    return {
      id: lesson.id,
      time: `${lesson.startTime}-${lesson.endTime}`,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      courseName: lesson.group.course.name,
      groupName: lesson.group.name,
      room: lesson.group.room?.name || '-',
      studentCount: lesson.group.enrollments.length,
      students: lesson.group.enrollments.map((enrollment) => enrollment.student),
      status: lesson.status,
      statusLabel: status.label,
      statusTone: status.tone,
      attendanceSubmittedAt: lesson.attendanceSubmittedAt || (attendanceSubmitted ? lesson.attendances[0]?.createdAt : null),
      lessonId: lesson.id,
      hasFeedback: expectedStudentIds.length > 0
        ? expectedStudentIds.every((studentId) => covered.has(studentId))
        : lesson.classroomFeedbacks.length > 0,
      feedbackId: lesson.classroomFeedbacks[0]?.id || null,
    }
  })

  const endedTodayLessons = todayLessons.filter((lesson) => atTime(lesson.lessonDate, lesson.endTime) < now)
  const attendanceSubmittedFor = (lesson: typeof todayLessons[number]) => {
    const expectedStudentIds = lesson.group.intensiveMode === 'INTENSIVE'
      ? lesson.lessonStudents.map((student) => student.studentId)
      : lesson.group.enrollments.map((enrollment) => enrollment.student.id)
    return hasSubmittedLessonAttendance({
      attendanceSubmittedAt: lesson.attendanceSubmittedAt,
      status: lesson.status,
      attendances: lesson.attendances,
      expectedStudentIds,
    })
  }
  const pendingAttendanceLessons = endedTodayLessons.filter((lesson) => !attendanceSubmittedFor(lesson))
  const pendingFeedbackLessons = todayLessons.filter((lesson) => {
    if (!attendanceSubmittedFor(lesson)) return false
    const expectedStudentIds = lesson.group.enrollments.map((enrollment) => enrollment.student.id)
    if (expectedStudentIds.length === 0) return false
    const covered = coveredStudentIdsFor(lesson)
    return expectedStudentIds.some((studentId) => !covered.has(studentId))
  })
  const unreadParentComments = unreadPaperComments + unreadPostComments

  const [studyHallClasses, studyHallClosures] = activeTerm && resolvedTeacherUserId ? await Promise.all([
    prisma.studyHallClass.findMany({
      where: {
        termId,
        status: 'ACTIVE',
        weekdays: { has: todayWeekday },
        teachers: { some: { teacherId: resolvedTeacherUserId, active: true } },
      },
      select: {
        id: true,
        name: true,
        scheduleType: true,
        students: {
          where: { status: 'ACTIVE' },
          select: { studentId: true, joinedAt: true, leftAt: true },
        },
        sessions: {
          where: { active: true, weekday: todayWeekday },
          select: { id: true },
        },
        records: {
          where: { studyDate: todayDate },
          take: 1,
          select: {
            entries: {
              select: { studentId: true, attendanceKey: true, attendanceStatus: true, homeworkStatus: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.studyHallClosure.findMany({
      where: {
        termId,
        startDate: { lte: todayDate },
        endDate: { gte: todayDate },
      },
      select: { classId: true },
    }),
  ]) : [[], []]

  const globallyClosed = studyHallClosures.some((closure) => !closure.classId)
  const closedClassIds = new Set(studyHallClosures.flatMap((closure) => closure.classId ? [closure.classId] : []))
  const studyHallPending = globallyClosed ? [] : studyHallClasses
    .filter((studyClass) => !closedClassIds.has(studyClass.id))
    .map((studyClass) => {
      const activeStudents = studyClass.students.filter((member) => (
        member.joinedAt <= todayDate && (!member.leftAt || member.leftAt >= todayDate)
      ))
      const targetKeys = studyClass.scheduleType === 'WEEKEND'
        ? studyClass.sessions.map((session) => attendanceKey(session.id))
        : ['DAY']
      const entries = studyClass.records[0]?.entries || []
      const expected = activeStudents.length * targetKeys.length
      const attendanceDone = entries.filter((entry) => activeStudents.some((member) => member.studentId === entry.studentId)
        && targetKeys.includes(entry.attendanceKey)
        && ['PRESENT', 'PERSONAL_LEAVE', 'ABSENT'].includes(entry.attendanceStatus)).length
      const homeworkDone = entries.filter((entry) => activeStudents.some((member) => member.studentId === entry.studentId)
        && targetKeys.includes(entry.attendanceKey)
        && entry.homeworkStatus !== 'NOT_RECORDED').length
      return {
        ...studyClass,
        expected,
        attendancePending: Math.max(0, expected - attendanceDone),
        homeworkPending: Math.max(0, expected - homeworkDone),
      }
    })
    .filter((studyClass) => studyClass.expected > 0)

  const pendingStudyHallAttendance = studyHallPending.reduce((sum, item) => sum + item.attendancePending, 0)
  const pendingStudyHallHomework = studyHallPending.reduce((sum, item) => sum + item.homeworkPending, 0)

  const todos = [
    ...decoratedTodayLessons
      .filter((lesson) => lesson.statusLabel === '待上课' || lesson.statusLabel === '上课中')
      .slice(0, 1)
      .map((lesson) => ({
        id: `next-${lesson.id}`,
        type: 'lesson',
        title: `${lesson.time} ${lesson.groupName}`,
        description: `${lesson.courseName} · ${lesson.room} · ${lesson.studentCount}人`,
        status: lesson.statusLabel,
        tone: lesson.statusTone,
        actionLabel: '查看课表',
        href: '/teacher/schedule',
      })),
    ...pendingAttendanceLessons.map((lesson) => ({
      id: `attendance-${lesson.id}`,
      type: 'attendance',
      title: `${lesson.startTime}-${lesson.endTime} ${lesson.group.name}`,
      description: `${lesson.group.course.name} · 已结束，待提交考勤`,
      status: '待考勤',
      tone: 'red',
      actionLabel: '去考勤',
      href: '/teacher/attendance',
    })),
    ...pendingFeedbackLessons.map((lesson) => ({
      id: `feedback-${lesson.id}`,
      type: 'feedback',
      title: `${lesson.startTime}-${lesson.endTime} ${lesson.group.name}`,
      description: `${lesson.group.course.name} · 已考勤，待发布课堂反馈`,
      status: '待发反馈',
      tone: 'purple',
      actionLabel: '发布反馈',
      href: `/teacher/feedback?lessonId=${lesson.id}`,
    })),
    ...studyHallPending.flatMap((studyClass) => [
      ...(studyClass.attendancePending ? [{
        id: `study-hall-attendance-${studyClass.id}`,
        type: 'study-hall-attendance',
        title: `${studyClass.name} · 作业班考勤`,
        description: `今天还有 ${studyClass.attendancePending} 项考勤未完成`,
        status: '待考勤',
        tone: 'red',
        actionLabel: '去考勤',
        href: `/teacher/study-hall?mode=attendance&classId=${studyClass.id}&date=${todayKey}`,
      }] : []),
      ...(studyClass.homeworkPending ? [{
        id: `study-hall-homework-${studyClass.id}`,
        type: 'study-hall-homework',
        title: `${studyClass.name} · 作业登记`,
        description: `今天还有 ${studyClass.homeworkPending} 项作业未登记`,
        status: '待登记',
        tone: 'orange',
        actionLabel: '登记作业',
        href: `/teacher/study-hall?mode=homework&classId=${studyClass.id}&date=${todayKey}`,
      }] : []),
    ]),
    ...recentDraftPapers.slice(0, 3).map((paper) => ({
      id: `paper-${paper.id}`,
      type: 'paper',
      title: `${paper.student.name} · ${paper.title}`,
      description: '试卷已保存草稿，尚未推送家长',
      status: '待推送',
      tone: 'green',
      actionLabel: '推送家长',
      href: '/teacher/papers',
    })),
    ...pendingLeaveRequests.map((request) => ({
      id: `leave-${request.id}`,
      type: 'leave',
      title: `${request.student.name} 请假申请`,
      description: `${request.lesson?.group.course.name || '未指定课程'} · ${request.reason}`,
      status: '待审批',
      tone: 'brown',
      actionLabel: '去审批',
      href: '/teacher/leave',
    })),
  ].slice(0, 8)

  const feedbackTasks = [
    ...pendingFeedbackLessons.map((lesson) => ({
      id: `lesson-feedback-${lesson.id}`,
      type: '课堂反馈',
      title: lesson.group.name,
      description: `${lesson.startTime}-${lesson.endTime} · ${lesson.group.course.name}`,
      tone: 'purple',
      actionLabel: '发布课堂反馈',
      href: `/teacher/feedback?lessonId=${lesson.id}`,
    })),
    ...recentDraftPapers.slice(0, 4).map((paper) => ({
      id: `draft-paper-${paper.id}`,
      type: '试卷推送',
      title: paper.title,
      description: `${paper.student.name} · 待推送家长`,
      tone: 'green',
      actionLabel: '推送家长',
      href: '/teacher/papers',
    })),
    ...students
      .filter((student) => {
        const enrolledAt = student.enrollments
          .filter((enrollment) => enrollment.status === 'ACTIVE')
          .map((enrollment) => enrollment.enrolledAt)
          .sort((a, b) => a.getTime() - b.getTime())[0]
        return daysSince(enrolledAt) >= 3
          && daysSince(latestFeedbackDateByStudent.get(student.id)) > 7
      })
      .slice(0, 4)
      .map((student) => ({
        id: `feedback-${student.id}`,
        type: '课堂反馈',
        title: student.name,
        description: '最近 7 天还没有课堂反馈',
        tone: 'orange',
        actionLabel: '发布课堂反馈',
        href: '/teacher/feedback',
      })),
  ].slice(0, 8)

  const endedWeekLessons = weekLessons.filter((lesson) => atTime(lesson.lessonDate, lesson.endTime) < now)
  const attendanceDone = endedWeekLessons.filter((lesson) => hasSubmittedLessonAttendance({
    attendanceSubmittedAt: lesson.attendanceSubmittedAt,
    status: lesson.status,
    attendances: lesson.attendances,
    expectedStudentIds: lesson.lessonStudents.map((student) => student.studentId),
  })).length
  const feedbackExpectedGroupIds = new Set(
    weekLessons
      .filter((lesson) => lesson.status === 'COMPLETED' || lesson.attendanceSubmittedAt)
      .map((lesson) => lesson.groupId),
  )
  const feedbackDoneGroupIds = new Set<string>()
  weekPublishedFeedbacks.forEach((feedback) => {
    if (feedback.feedbackGroupId) {
      feedbackDoneGroupIds.add(feedback.feedbackGroupId)
      return
    }
    if (feedback.classLesson?.groupId) feedbackDoneGroupIds.add(feedback.classLesson.groupId)
  })
  const classroomDone = [...feedbackExpectedGroupIds].filter((groupId) => feedbackDoneGroupIds.has(groupId)).length
  const paperDone = weekPapers.filter((paper) => paper.status === 'PUBLISHED').length
  const weekFeedbackStudentIds = new Set(
    students
      .filter((student) => {
        const latestFeedbackAt = latestFeedbackDateByStudent.get(student.id)
        return !!latestFeedbackAt && latestFeedbackAt >= weekStart && latestFeedbackAt < weekEnd
      })
      .map((student) => student.id),
  )
  const monthlyHours = roundHours(monthLessons.reduce((sum, lesson) => sum + minutesToHours(lesson.group.lessonMinutes), 0))

  // ===== 教师端动态图表：近 6 个月课时/薪酬 + 出勤，按「月 × 4 周」 =====
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const [monthAttendanceForTrend, salaryTxForTrend, hoursTxForTrend] = await Promise.all([
    prisma.classLesson.findMany({
      where: { ...lessonWhere, lessonDate: { gte: sixMonthsAgo } },
      select: { lessonDate: true, attendances: { select: { status: true } } },
    }),
    prisma.teacherSalaryTransaction.findMany({
      where: { teacherId, createdAt: { gte: sixMonthsAgo }, deletedAt: null },
      select: { createdAt: true, amount: true },
    }),
    prisma.attendance.findMany({
      where: { lesson: { ...lessonWhere, lessonDate: { gte: sixMonthsAgo } }, deletedAt: null },
      select: { hoursDeducted: true, lesson: { select: { lessonDate: true } } },
    }),
  ])
  const trendMonthKeys: string[] = []
  for (let i = 5; i >= 0; i--) {
    const trendDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    trendMonthKeys.push(trendDate.getFullYear() + '-' + trendDate.getMonth())
  }
  const trendLabels = trendMonthKeys.map((key) => (Number(key.split('-')[1]) + 1) + '月')
  // 月内按 4 周分桶：1-7 第1周 / 8-14 第2周 / 15-21 第3周 / 22-31 第4周
  const monthWeekKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}-${Math.min(3, Math.floor((d.getDate() - 1) / 7))}`
  const allMonthWeekKeys = trendMonthKeys.flatMap((key) => Array.from({ length: 4 }, (_, w) => `${key}-${w}`))
  const hourBuckets = new Map<string, number>(allMonthWeekKeys.map((key) => [key, 0]))
  for (const item of hoursTxForTrend) {
    if (!item.lesson?.lessonDate) continue
    const key = monthWeekKey(item.lesson.lessonDate)
    if (hourBuckets.has(key)) hourBuckets.set(key, (hourBuckets.get(key) || 0) + (item.hoursDeducted || 0))
  }
  const payBuckets = new Map<string, number>(allMonthWeekKeys.map((key) => [key, 0]))
  for (const tx of salaryTxForTrend) {
    const key = monthWeekKey(tx.createdAt)
    if (payBuckets.has(key)) payBuckets.set(key, (payBuckets.get(key) || 0) + tx.amount)
  }
  const salaryByMonth = trendMonthKeys.map((key, index) => ({
    key,
    label: trendLabels[index],
    weeks: Array.from({ length: 4 }, (_, w) => ({
      label: '第' + (w + 1) + '周',
      hours: Number((hourBuckets.get(`${key}-${w}`) || 0).toFixed(1)),
      pay: Math.round(payBuckets.get(`${key}-${w}`) || 0),
    })),
  }))
  const attendanceBuckets = new Map<string, { present: number; total: number }>()
  for (const lesson of monthAttendanceForTrend) {
    const key = monthWeekKey(lesson.lessonDate)
    const bucket = attendanceBuckets.get(key) || { present: 0, total: 0 }
    bucket.total += lesson.attendances.length
    bucket.present += lesson.attendances.filter((item) => item.status === 'PRESENT').length
    attendanceBuckets.set(key, bucket)
  }
  const attendanceByMonth = trendMonthKeys.map((key, index) => ({
    key,
    label: trendLabels[index],
    weeks: Array.from({ length: 4 }, (_, w) => {
      const bucket = attendanceBuckets.get(`${key}-${w}`)
      return {
        label: '第' + (w + 1) + '周',
        rate: bucket && bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 100) : null,
      }
    }),
  }))

  return {
    heroStats: {
      todayLessons: todayLessons.length,
      pendingAttendance: pendingAttendanceLessons.length,
      pendingFeedback: pendingFeedbackLessons.length,
      pendingPapers: recentDraftPapers.length,
      pendingLeave: pendingLeaveRequests.length,
      totalTodos: todos.length + unreadParentComments,
      pendingStudyHallAttendance,
      pendingStudyHallHomework,
    },
    todayLessons: decoratedTodayLessons,
    todos,
    feedbackTasks,
    weekCompletion: {
      attendance: { done: attendanceDone, total: endedWeekLessons.length, percent: percent(attendanceDone, endedWeekLessons.length) },
      classroomFeedback: { done: classroomDone, total: feedbackExpectedGroupIds.size, percent: percent(classroomDone, feedbackExpectedGroupIds.size) },
      parentMessages: {
        done: weekTeacherMessages.filter((message) => message.readAt).length,
        total: weekTeacherMessages.length,
        percent: percent(weekTeacherMessages.filter((message) => message.readAt).length, weekTeacherMessages.length),
      },
    },
    quickActions: [
      { label: '提交今日考勤', desc: '完成课后考勤与课时结算', href: '/teacher/attendance', tone: 'orange' },
      { label: '我的课表', desc: '查看本周课表与上课安排', href: '/teacher/teaching-schedule', tone: 'green' },
      { label: '薪酬福利', desc: '查看薪资流水与福利明细', href: '/teacher/compensation', tone: 'brown' },
      { label: '仿真教学', desc: 'AI 仿真课堂辅助教学', href: '/teacher/ai', tone: 'green' },
      { label: '发布课堂反馈', desc: '记录课堂内容与作业建议', href: '/teacher/feedback', tone: 'purple' },
      { label: '家长留言', desc: '查看并回复家长留言', href: '/teacher/messages', tone: 'blue' },
      { label: '查看我的学生', desc: '查看课时、出勤与学习档案', href: '/teacher/students', tone: 'brown' },
      { label: '课程预告', desc: '查看即将开始的课程安排', href: '/teacher/lesson-previews', tone: 'dark' },
    ],
    pendingTasks: {
      unsubmittedAttendance: pendingAttendanceLessons.length,
      unpublishedPapers: recentDraftPapers.length,
      unreadParentComments,
      pendingLeave: pendingLeaveRequests.length,
      pendingStudyHallAttendance,
      pendingStudyHallHomework,
    },
    monthlyStats: {
      totalStudents: students.length,
      monthlyHours,
      attendanceRate: percent(attendanceDone, endedWeekLessons.length),
      paperPublished: paperDone,
    },
    attendanceByMonth,
    salaryByMonth,
    weeklyRates: {
      attendance: { done: attendanceDone, total: endedWeekLessons.length },
      parentMessages: { done: weekTeacherMessages.filter((message) => message.readAt).length, total: weekTeacherMessages.length },
      feedback: { done: weekFeedbackStudentIds.size, total: students.length },
    },
  }
}
