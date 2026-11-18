import { getRequestPrisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { teacherLessonWhere, teacherStudentWhere, todayRange, weekRange } from '@/lib/teacher-portal'
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
  const lessonWhere = teacherLessonWhere(teacherId, termId)
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
              include: { student: { select: { id: true, name: true, grade: true, school: true } } },
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
        schedule: { select: { startTime: true, course: { select: { name: true } } } },
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
      href: `/teacher/classroom-feedback?lessonId=${lesson.id}`,
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
      description: `${request.schedule?.course?.name || '未指定课程'} · ${request.reason}`,
      status: '待审批',
      tone: 'brown',
      actionLabel: '去审批',
      href: '/teacher/leave',
    })),
  ].slice(0, 8)

  const studentWarnings = students.flatMap((student) => {
    const activeEnrollments = student.enrollments.filter((enrollment) => enrollment.status === 'ACTIVE')
    const hasPaidEnrollment = activeEnrollments.some((enrollment) => Number(enrollment.totalHours || 0) > 0)
    const remainHours = roundHours(activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0))
    const lastFeedbackAt = latestFeedbackDateByStudent.get(student.id)
    const firstEnrolledAt = activeEnrollments
      .map((enrollment) => enrollment.enrolledAt)
      .sort((a, b) => a.getTime() - b.getTime())[0]
    const daysFromEnroll = daysSince(firstEnrolledAt)
    const recentBadAttendance = student.attendances.filter((attendance) => ['ABSENT', 'LEAVE'].includes(attendance.status)).length
    const hasWeakPaper = student.examPapers.some((paper) => paper.questions.some((question) => question.mastery === 'NEEDS_PRACTICE'))
    const warnings = []

    if (hasPaidEnrollment && remainHours <= 2) {
      warnings.push({
        id: `${student.id}-hours`,
        studentId: student.id,
        name: student.name,
        grade: student.grade || '-',
        school: student.school || '-',
        type: '课时不足',
        reason: `剩余 ${remainHours} 课时`,
        tone: 'red',
        actionLabel: '查看档案',
        href: `/teacher/students/${student.id}`,
      })
    }
    if (daysFromEnroll >= 3 && daysSince(lastFeedbackAt) > 7) {
      warnings.push({
        id: `${student.id}-feedback`,
        studentId: student.id,
        name: student.name,
        grade: student.grade || '-',
        school: student.school || '-',
        type: '长期未反馈',
        reason: lastFeedbackAt ? `${daysSince(lastFeedbackAt)} 天未发布课堂反馈` : '从未发布课堂反馈',
        tone: 'purple',
        actionLabel: '发布反馈',
        href: '/teacher/feedback',
      })
    }
    if (recentBadAttendance >= 2) {
      warnings.push({
        id: `${student.id}-attendance`,
        studentId: student.id,
        name: student.name,
        grade: student.grade || '-',
        school: student.school || '-',
        type: '出勤需关注',
        reason: `最近 3 次考勤中缺勤/请假 ${recentBadAttendance} 次`,
        tone: 'orange',
        actionLabel: '查看档案',
        href: `/teacher/students/${student.id}`,
      })
    }
    if (hasWeakPaper) {
      warnings.push({
        id: `${student.id}-paper`,
        studentId: student.id,
        name: student.name,
        grade: student.grade || '-',
        school: student.school || '-',
        type: '成绩需关注',
        reason: '最近试卷存在需要练习的知识点',
        tone: 'blue',
        actionLabel: '查看档案',
        href: `/teacher/students/${student.id}`,
      })
    }

    return warnings
  }).slice(0, 8)

  const feedbackTasks = [
    ...pendingFeedbackLessons.map((lesson) => ({
      id: `lesson-feedback-${lesson.id}`,
      type: '课堂反馈',
      title: lesson.group.name,
      description: `${lesson.startTime}-${lesson.endTime} · ${lesson.group.course.name}`,
      tone: 'purple',
      actionLabel: '发布课堂反馈',
      href: `/teacher/classroom-feedback?lessonId=${lesson.id}`,
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

  // ===== 教师端动态图表：本月各周到课率 + 近 6 个月课时/薪酬趋势 =====
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const [monthAttendanceForTrend, salaryTxForTrend, hoursTxForTrend] = await Promise.all([
    prisma.classLesson.findMany({
      where: { ...lessonWhere, lessonDate: { gte: monthStart } },
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
  const weekBuckets = new Map<number, { present: number; total: number }>()
  for (const lesson of monthAttendanceForTrend) {
    const week = Math.min(4, Math.floor((lesson.lessonDate.getDate() - 1) / 7))
    const bucket = weekBuckets.get(week) || { present: 0, total: 0 }
    bucket.total += lesson.attendances.length
    bucket.present += lesson.attendances.filter((item) => item.status === 'PRESENT').length
    weekBuckets.set(week, bucket)
  }
  const attendanceWeekTrend = Array.from({ length: 5 }, (_, index) => {
    const bucket = weekBuckets.get(index)
    return { label: '第' + (index + 1) + '周', rate: bucket && bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 100) : null }
  }).filter((item): item is { label: string; rate: number } => item.rate !== null)

  const trendMonthKeys: string[] = []
  for (let i = 5; i >= 0; i--) {
    const trendDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    trendMonthKeys.push(trendDate.getFullYear() + '-' + trendDate.getMonth())
  }
  const trendLabels = trendMonthKeys.map((key) => (Number(key.split('-')[1]) + 1) + '月')
  const hoursByMonth = new Map<string, number>(trendMonthKeys.map((key) => [key, 0]))
  for (const item of hoursTxForTrend) {
    const key = item.lesson?.lessonDate ? item.lesson.lessonDate.getFullYear() + '-' + item.lesson.lessonDate.getMonth() : ''
    if (key && hoursByMonth.has(key)) hoursByMonth.set(key, (hoursByMonth.get(key) || 0) + (item.hoursDeducted || 0))
  }
  const payByMonth = new Map<string, number>(trendMonthKeys.map((key) => [key, 0]))
  for (const tx of salaryTxForTrend) {
    const key = tx.createdAt.getFullYear() + '-' + tx.createdAt.getMonth()
    if (payByMonth.has(key)) payByMonth.set(key, (payByMonth.get(key) || 0) + tx.amount)
  }
  const salaryTrend = trendMonthKeys.map((key, index) => ({
    label: trendLabels[index],
    hours: Number((hoursByMonth.get(key) || 0).toFixed(1)),
    pay: Math.round(payByMonth.get(key) || 0),
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
    studentWarnings,
    feedbackTasks,
    weekCompletion: {
      attendance: { done: attendanceDone, total: endedWeekLessons.length, percent: percent(attendanceDone, endedWeekLessons.length) },
      classroomFeedback: { done: classroomDone, total: feedbackExpectedGroupIds.size, percent: percent(classroomDone, feedbackExpectedGroupIds.size) },
      paperPush: { done: paperDone, total: weekPapers.length, percent: percent(paperDone, weekPapers.length) },
    },
    quickActions: [
      { label: '提交今日考勤', desc: '完成课后考勤与课时结算', href: '/teacher/attendance', tone: 'orange' },
      { label: '作业班工作台', desc: '处理晚托考勤与作业登记', href: '/teacher/study-hall', tone: 'green' },
      { label: '处理请假审批', desc: '批准或驳回家长请假申请', href: '/teacher/leave', tone: 'brown' },
      { label: '上传试卷', desc: '上传试卷并推送给家长', href: '/teacher/papers', tone: 'green' },
      { label: '发布课堂反馈', desc: '记录课堂内容与作业建议', href: '/teacher/classroom-feedback', tone: 'purple' },
      { label: '发布表现反馈', desc: '同步学生近期学习状态', href: '/teacher/performance', tone: 'blue' },
      { label: '查看我的学生', desc: '查看课时、出勤与学习档案', href: '/teacher/students', tone: 'brown' },
      { label: '打开 AI 助手', desc: '辅助备课、出题与讲解', href: '/teacher/ai', tone: 'dark' },
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
    attendanceWeekTrend,
    salaryTrend,
    weeklyRates: {
      attendance: { done: attendanceDone, total: endedWeekLessons.length },
      papers: { done: paperDone, total: weekPapers.length },
      feedback: { done: weekFeedbackStudentIds.size, total: students.length },
    },
  }
}
