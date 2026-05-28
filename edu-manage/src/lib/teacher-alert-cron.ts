import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { ALERT_TYPES, TEACHER_LOG_ACTIONS, todayRange } from '@/lib/teacher-portal'

async function createAlertOnce(teacherId: string, type: string, message: string, since: Date) {
  const existing = await prisma.teacherAlert.findFirst({
    where: { teacherId, type, isResolved: false, createdAt: { gte: since } },
  })
  if (existing) return false
  await prisma.teacherAlert.create({ data: { teacherId, type, message } })
  return true
}

export async function checkTeacherAlerts() {
  const now = new Date()
  const { start: today, end: todayEnd } = todayRange(now)
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000)
  const oneDayAgo = new Date(now.getTime() - 86400000)

  const teachers = await prisma.teacher.findMany({ where: { status: 'ACTIVE' } })
  let createdAlerts = 0

  for (const teacher of teachers) {
    const [completedLessons, submittedLogs, studentCount, recentPapers, stalePaperComments, stalePostComments, loginToday] = await Promise.all([
      prisma.classLesson.findMany({
        where: { teacherId: teacher.id, lessonDate: { gte: today, lt: todayEnd }, status: 'COMPLETED' },
        include: { attendances: true },
      }),
      prisma.activityLog.count({
        where: { teacherId: teacher.id, action: TEACHER_LOG_ACTIONS.ATTENDANCE_SUBMIT, createdAt: { gte: today, lt: todayEnd } },
      }),
      prisma.student.count({
        where: {
          status: { not: 'INACTIVE' },
          OR: [
            { mainTeacherId: teacher.id },
            { enrollments: { some: { status: 'ACTIVE', group: { teacherId: teacher.id } } } },
          ],
        },
      }),
      prisma.examPaper.count({ where: { teacherId: teacher.id, createdAt: { gte: threeDaysAgo } } }),
      prisma.paperComment.count({ where: { isRead: false, createdAt: { lte: oneDayAgo }, author: { role: 'parent' }, paper: { teacherId: teacher.id } } }),
      prisma.postComment.count({ where: { isRead: false, createdAt: { lte: oneDayAgo }, author: { role: 'parent' }, post: { teacherId: teacher.id, deletedAt: null } } }),
      prisma.activityLog.count({ where: { teacherId: teacher.id, action: TEACHER_LOG_ACTIONS.TEACHER_LOGIN, createdAt: { gte: today, lt: todayEnd } } }),
    ])

    const missingAttendance = completedLessons.filter((lesson) => lesson.attendances.length === 0).length
    if (missingAttendance > 0 || submittedLogs < completedLessons.length) {
      const created = await createAlertOnce(
        teacher.id,
        ALERT_TYPES.NO_ATTENDANCE,
        `${teacher.name}今日有${Math.max(missingAttendance, completedLessons.length - submittedLogs)}节课未提交考勤`,
        today
      )
      if (created) {
        createdAlerts += 1
        await prisma.activityLog.create({
          data: {
            teacherId: teacher.id,
            action: TEACHER_LOG_ACTIONS.ATTENDANCE_MISSING,
            detail: `系统检测：${Math.max(missingAttendance, completedLessons.length - submittedLogs)}节课考勤未提交`,
          },
        })
      }
    }

    if (studentCount > 0 && recentPapers === 0) {
      const created = await createAlertOnce(teacher.id, ALERT_TYPES.NO_PAPER, `${teacher.name}过去3天未推送试卷（带${studentCount}名学员）`, threeDaysAgo)
      if (created) createdAlerts += 1
    }

    const staleComments = stalePaperComments + stalePostComments
    if (staleComments > 0) {
      const created = await createAlertOnce(teacher.id, ALERT_TYPES.NO_FEEDBACK, `${teacher.name}有${staleComments}条家长留言超过24小时未回复`, oneDayAgo)
      if (created) createdAlerts += 1
    }

    if (loginToday === 0 && completedLessons.length > 0) {
      const created = await createAlertOnce(teacher.id, ALERT_TYPES.NO_LOGIN, `${teacher.name}今日有${completedLessons.length}节课但未登录系统`, today)
      if (created) createdAlerts += 1
    }
  }

  revalidatePath('/teacher-logs')
  revalidatePath('/dashboard')
  return { checked: teachers.length, createdAlerts, timestamp: new Date().toISOString() }
}
