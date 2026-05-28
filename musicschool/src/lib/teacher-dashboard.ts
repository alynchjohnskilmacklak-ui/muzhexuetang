import { prisma } from '@/lib/prisma'
import { teacherLessonWhere, teacherStudentWhere, todayRange, weekRange } from '@/lib/teacher-portal'
import { visibleStudentWhere } from '@/lib/business-visibility'
import { minutesToHours, roundHours } from '@/lib/hours'

function atTime(date: Date, time: string) {
  const [hour, minute] = time.split(':').map(Number)
  const value = new Date(date)
  value.setHours(hour || 0, minute || 0, 0, 0)
  return value
}

function lessonStatusLabel(lesson: { lessonDate: Date; startTime: string; endTime: string; status: string; attendanceSubmittedAt?: Date | null }, now = new Date()) {
  const start = atTime(lesson.lessonDate, lesson.startTime)
  const end = atTime(lesson.lessonDate, lesson.endTime)

  if (lesson.status === 'COMPLETED' && lesson.attendanceSubmittedAt) return { label: '已完成', tone: 'green' }
  if (lesson.attendanceSubmittedAt) return { label: '已考勤', tone: 'green' }
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

export async function getTeacherDashboardData(teacherId: string) {
  const now = new Date()
  const { start: today, end: todayEnd } = todayRange(now)
  const { start: weekStart, end: weekEnd } = weekRange(now)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lessonWhere = teacherLessonWhere(teacherId)
  const studentWhere = teacherStudentWhere(teacherId)

  const [
    todayLessons,
    weekLessons,
    monthLessons,
    students,
    weekPapers,
    recentDraftPapers,
    unreadPaperComments,
    unreadPostComments,
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
        classroomFeedbacks: { where: { teacherId, status: 'PUBLISHED' }, select: { id: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.classLesson.findMany({
      where: { ...lessonWhere, lessonDate: { gte: weekStart, lt: weekEnd } },
      include: {
        attendances: true,
        classroomFeedbacks: { where: { teacherId, status: 'PUBLISHED' }, select: { id: true } },
      },
    }),
    prisma.classLesson.findMany({
      where: { ...lessonWhere, lessonDate: { gte: monthStart } },
      select: { lessonDate: true, startTime: true, endTime: true, group: { select: { lessonMinutes: true } } },
    }),
    prisma.student.findMany({
      where: studentWhere,
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { group: { include: { course: true } } },
        },
        attendances: {
          where: { lesson: lessonWhere },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        performancePosts: {
          where: { teacherId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        examPapers: {
          where: { teacherId, status: { not: 'DELETED' } },
          include: { questions: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.examPaper.findMany({
      where: {
        teacherId,
        status: { not: 'DELETED' },
        paperDate: { gte: weekStart, lt: weekEnd },
        student: visibleStudentWhere,
      },
      include: { student: { select: { id: true, name: true, grade: true, school: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.examPaper.findMany({
      where: {
        teacherId,
        status: 'DRAFT',
        student: visibleStudentWhere,
      },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.paperComment.count({ where: { isRead: false, author: { role: 'parent' }, paper: { teacherId } } }),
    prisma.postComment.count({ where: { isRead: false, author: { role: 'parent' }, post: { teacherId, deletedAt: null } } }),
  ])

  const decoratedTodayLessons = todayLessons.map((lesson) => {
    const status = lessonStatusLabel(lesson, now)
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
      attendanceSubmittedAt: lesson.attendanceSubmittedAt,
      hasFeedback: lesson.classroomFeedbacks.length > 0,
    }
  })

  const endedTodayLessons = todayLessons.filter((lesson) => atTime(lesson.lessonDate, lesson.endTime) < now)
  const pendingAttendanceLessons = endedTodayLessons.filter((lesson) => !lesson.attendanceSubmittedAt)
  const pendingFeedbackLessons = todayLessons.filter((lesson) => lesson.attendanceSubmittedAt && lesson.classroomFeedbacks.length === 0)
  const unreadParentComments = unreadPaperComments + unreadPostComments

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
      href: '/teacher/classroom-feedback',
    })),
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
  ].slice(0, 8)

  const studentWarnings = students.flatMap((student) => {
    const activeEnrollments = student.enrollments.filter((enrollment) => enrollment.status === 'ACTIVE')
    const hasPaidEnrollment = activeEnrollments.some((enrollment) => Number(enrollment.totalHours || 0) > 0)
    const remainHours = roundHours(activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0))
    const lastPost = student.performancePosts[0]?.createdAt
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
    if (daysFromEnroll >= 3 && daysSince(lastPost) > 7) {
      warnings.push({
        id: `${student.id}-feedback`,
        studentId: student.id,
        name: student.name,
        grade: student.grade || '-',
        school: student.school || '-',
        type: '长期未反馈',
        reason: lastPost ? `${daysSince(lastPost)} 天未发布表现反馈` : '从未发布表现反馈',
        tone: 'purple',
        actionLabel: '发布反馈',
        href: `/teacher/performance?studentId=${student.id}`,
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
      href: '/teacher/classroom-feedback',
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
        return daysSince(enrolledAt) >= 3 && daysSince(student.performancePosts[0]?.createdAt) > 7
      })
      .slice(0, 4)
      .map((student) => ({
        id: `performance-${student.id}`,
        type: '表现反馈',
        title: student.name,
        description: '本周还没有表现反馈',
        tone: 'orange',
        actionLabel: '发布表现反馈',
        href: `/teacher/performance?studentId=${student.id}`,
      })),
  ].slice(0, 8)

  const endedWeekLessons = weekLessons.filter((lesson) => atTime(lesson.lessonDate, lesson.endTime) < now)
  const attendanceDone = endedWeekLessons.filter((lesson) => lesson.attendanceSubmittedAt || lesson.attendances.length > 0).length
  const completedWeekLessons = weekLessons.filter((lesson) => lesson.status === 'COMPLETED' || lesson.attendanceSubmittedAt)
  const classroomDone = completedWeekLessons.filter((lesson) => lesson.classroomFeedbacks.length > 0).length
  const paperDone = weekPapers.filter((paper) => paper.status === 'PUBLISHED').length
  const weekPerformanceStudentIds = new Set(
    students
      .filter((student) => {
        const lastPost = student.performancePosts[0]?.createdAt
        return !!lastPost && lastPost >= weekStart && lastPost < weekEnd
      })
      .map((student) => student.id)
  )
  const monthlyHours = roundHours(monthLessons.reduce((sum, lesson) => sum + minutesToHours(lesson.group.lessonMinutes), 0))

  return {
    heroStats: {
      todayLessons: todayLessons.length,
      pendingAttendance: pendingAttendanceLessons.length,
      pendingFeedback: pendingFeedbackLessons.length,
      pendingPapers: recentDraftPapers.length,
      totalTodos: todos.length + unreadParentComments,
    },
    todayLessons: decoratedTodayLessons,
    todos,
    studentWarnings,
    feedbackTasks,
    weekCompletion: {
      attendance: { done: attendanceDone, total: endedWeekLessons.length, percent: percent(attendanceDone, endedWeekLessons.length) },
      classroomFeedback: { done: classroomDone, total: completedWeekLessons.length, percent: percent(classroomDone, completedWeekLessons.length) },
      paperPush: { done: paperDone, total: weekPapers.length, percent: percent(paperDone, weekPapers.length) },
      performance: { done: weekPerformanceStudentIds.size, total: students.length, percent: percent(weekPerformanceStudentIds.size, students.length) },
    },
    quickActions: [
      { label: '提交今日考勤', desc: '完成课后考勤与课时结算', href: '/teacher/attendance', tone: 'orange' },
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
    },
    monthlyStats: {
      totalStudents: students.length,
      monthlyHours,
      attendanceRate: percent(attendanceDone, endedWeekLessons.length),
      paperPublished: paperDone,
    },
    weeklyRates: {
      attendance: { done: attendanceDone, total: endedWeekLessons.length },
      papers: { done: paperDone, total: weekPapers.length },
      feedback: { done: weekPerformanceStudentIds.size, total: students.length },
    },
  }
}
