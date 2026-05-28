import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser, TEACHER_LOG_ACTIONS, todayRange, weekRange } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdminUser()
    const now = new Date()
    const { start: today, end: todayEnd } = todayRange(now)
    const { start: weekStart, end: weekEnd } = weekRange(now)

    const teachers = await prisma.teacher.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    })

    const rows = await Promise.all(teachers.map(async (teacher) => {
      const [todayLogs, todayLessons, draftPapers, alerts] = await Promise.all([
        prisma.activityLog.findMany({
          where: { teacherId: teacher.id, createdAt: { gte: today, lt: todayEnd } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.classLesson.findMany({
          where: { teacherId: teacher.id, lessonDate: { gte: today, lt: todayEnd }, status: 'COMPLETED' },
          include: { attendances: true },
        }),
        prisma.examPaper.count({ where: { teacherId: teacher.id, status: 'DRAFT' } }),
        prisma.teacherAlert.count({ where: { teacherId: teacher.id, isResolved: false } }),
      ])

      const submittedLessonIds = new Set(
        todayLogs
          .filter((log) => log.action === TEACHER_LOG_ACTIONS.ATTENDANCE_SUBMIT && log.entityType === 'ClassLesson' && log.entityId)
          .map((log) => log.entityId!)
      )
      const submittedCount = todayLessons.filter((lesson) => lesson.attendances.length > 0 || submittedLessonIds.has(lesson.id)).length
      const papersToday = todayLogs.filter((log) => log.action === TEACHER_LOG_ACTIONS.PAPER_PUBLISH).length
      const postsToday = todayLogs.filter((log) => log.action === TEACHER_LOG_ACTIONS.PERFORMANCE_POST).length
      const commentRepliesToday = todayLogs.filter((log) => log.action === TEACHER_LOG_ACTIONS.COMMENT_REPLY).length
      const lastAction = todayLogs[0] || null
      const status = !lastAction
        ? 'INACTIVE'
        : submittedCount < todayLessons.length
          ? 'PARTIAL'
          : 'ACTIVE'

      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        avatar: teacher.avatar,
        subjects: teacher.subjects,
        attendanceStatus: `${submittedCount}/${todayLessons.length}`,
        todayLessons: todayLessons.length,
        submittedCount,
        draftPapers,
        papersToday,
        postsToday,
        commentRepliesToday,
        lastAction: lastAction?.action || null,
        lastActionTime: lastAction?.createdAt?.toISOString() || null,
        status,
        alertCount: alerts,
      }
    }))

    const [totalDraftPapers, weeklyPublishedPapers, weeklyPosts, activeStudents, alertCount] = await Promise.all([
      prisma.examPaper.count({ where: { status: 'DRAFT' } }),
      prisma.examPaper.findMany({ where: { status: 'PUBLISHED', paperDate: { gte: weekStart, lt: weekEnd } }, select: { studentId: true } }),
      prisma.performancePost.findMany({ where: { deletedAt: null, createdAt: { gte: weekStart, lt: weekEnd } }, select: { studentId: true } }),
      prisma.student.count({ where: { status: { not: 'INACTIVE' } } }),
      prisma.teacherAlert.count({ where: { isResolved: false } }),
    ])

    const weekPaperStudents = new Set(weeklyPublishedPapers.map((paper) => paper.studentId)).size
    const weekFeedbackStudents = new Set(weeklyPosts.map((post) => post.studentId)).size

    return NextResponse.json({
      teachers: rows,
      summary: {
        attendanceCompleteTeachers: rows.filter((row) => row.todayLessons === 0 || row.submittedCount >= row.todayLessons).length,
        pendingPapers: totalDraftPapers,
        weeklyPaperRate: activeStudents ? Math.round((weekPaperStudents / activeStudents) * 100) : 100,
        weeklyFeedbackRate: activeStudents ? Math.round((weekFeedbackStudents / activeStudents) * 100) : 100,
        alertCount,
        activeCount: rows.filter((row) => row.status === 'ACTIVE').length,
        partialCount: rows.filter((row) => row.status === 'PARTIAL').length,
        inactiveCount: rows.filter((row) => row.status === 'INACTIVE').length,
      },
    })
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}
