import { revalidatePath } from 'next/cache'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { ALERT_TYPES, TEACHER_LOG_ACTIONS, teacherLessonScopeWhere, todayRange } from '@/lib/teacher-portal'
import { hasSubmittedAttendance, isAttendanceDue } from '@/lib/teacher-attendance-monitor'

async function createAlertOnce(db: PrismaClient, teacherId: string, type: string, message: string, since: Date) {
  const existing = await db.teacherAlert.findFirst({
    where: { teacherId, type, isResolved: false, createdAt: { gte: since } },
  })
  if (existing) return false
  await db.teacherAlert.create({ data: { teacherId, type, message } })
  return true
}

async function checkTeacherAlertsForDb(prisma: PrismaClient) {
  const now = new Date()
  const { start: today, end: todayEnd } = todayRange(now)
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000)
  const oneDayAgo = new Date(now.getTime() - 86400000)

  const teachers = await prisma.teacher.findMany({ where: { status: 'ACTIVE' } })
  let createdAlerts = 0

  for (const teacher of teachers) {
    const teacherLessonScope = await teacherLessonScopeWhere(prisma, teacher.id)
    const [todayLessons, studentCount, recentPapers, stalePaperComments, stalePostComments, loginToday] = await Promise.all([
      prisma.classLesson.findMany({
        where: {
          AND: [
            teacherLessonScope,
            {
              division: teacher.division,
              lessonDate: { gte: today, lt: todayEnd },
              status: { notIn: ['CANCELLED', 'POSTPONED'] },
              deletedAt: null,
              group: { status: { not: 'ARCHIVED' }, term: { status: 'ACTIVE' } },
            },
          ],
        },
        include: {
          attendances: { select: { id: true } },
          lessonStudents: { select: { studentId: true } },
          group: {
            select: {
              course: { select: { subject: true } },
              enrollments: {
                where: { status: 'ACTIVE', deletedAt: null, student: { status: { not: 'INACTIVE' } } },
                select: { studentId: true, subjects: true },
              },
            },
          },
        },
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

    const dueLessons = todayLessons.filter((lesson) => isAttendanceDue(lesson, now))
    const missingAttendance = dueLessons.filter((lesson) => !hasSubmittedAttendance(lesson)).length
    if (missingAttendance > 0) {
      const created = await createAlertOnce(
        prisma,
        teacher.id,
        ALERT_TYPES.NO_ATTENDANCE,
        `${teacher.name}今日有${missingAttendance}节课未提交考勤`,
        today
      )
      if (created) {
        createdAlerts += 1
        await prisma.activityLog.create({
          data: {
            teacherId: teacher.id,
            action: TEACHER_LOG_ACTIONS.ATTENDANCE_MISSING,
            detail: `系统检测：${missingAttendance}节课考勤未提交`,
          },
        })
      }
    } else {
      await prisma.teacherAlert.updateMany({
        where: { teacherId: teacher.id, type: ALERT_TYPES.NO_ATTENDANCE, isResolved: false, createdAt: { gte: today } },
        data: { isResolved: true },
      })
    }

    if (studentCount > 0 && recentPapers === 0) {
      const created = await createAlertOnce(prisma, teacher.id, ALERT_TYPES.NO_PAPER, `${teacher.name}过去3天未推送试卷（带${studentCount}名学员）`, threeDaysAgo)
      if (created) createdAlerts += 1
    }

    const staleComments = stalePaperComments + stalePostComments
    if (staleComments > 0) {
      const created = await createAlertOnce(prisma, teacher.id, ALERT_TYPES.NO_FEEDBACK, `${teacher.name}有${staleComments}条家长留言超过24小时未回复`, oneDayAgo)
      if (created) createdAlerts += 1
    }

    if (loginToday === 0 && dueLessons.length > 0) {
      const created = await createAlertOnce(prisma, teacher.id, ALERT_TYPES.NO_LOGIN, `${teacher.name}今日有${dueLessons.length}节课但未登录系统`, today)
      if (created) createdAlerts += 1
    }
  }

  revalidatePath('/teacher-logs')
  revalidatePath('/dashboard')
  return { checked: teachers.length, createdAlerts, timestamp: new Date().toISOString() }
}

export async function checkTeacherAlerts() {
  if (!isDualDbEnabled()) return checkTeacherAlertsForDb(prisma)

  const [junior, senior] = await Promise.all([
    checkTeacherAlertsForDb(getPrismaForDivision('JUNIOR')),
    checkTeacherAlertsForDb(getPrismaForDivision('SENIOR')),
  ])

  return {
    checked: junior.checked + senior.checked,
    createdAlerts: junior.createdAlerts + senior.createdAlerts,
    timestamp: new Date().toISOString(),
  }
}
