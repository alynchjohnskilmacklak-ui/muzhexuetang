import { NextResponse } from 'next/server'
import { requireAdminUser, TEACHER_LOG_ACTIONS, todayRange, weekRange } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const item of arr) {
    const k = key(item)
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(item)
  }
  return m
}

export async function GET() {
  try {
    const { prisma } = await requireAdminUser()
    const now = new Date()
    const { start: today, end: todayEnd } = todayRange(now)
    const { start: weekStart, end: weekEnd } = weekRange(now)

    const teachers = await prisma.teacher.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    })

    const teacherIds = teachers.map((teacher) => teacher.id)
    const [allLogs, allLessons, allDraftPapers, allAlerts] = await Promise.all([
      prisma.activityLog.findMany({
        where: {
          teacherId: { in: teacherIds },
          createdAt: { gte: today, lt: todayEnd },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.classLesson.findMany({
        where: {
          teacherId: { in: teacherIds },
          lessonDate: { gte: today, lt: todayEnd },
          status: 'COMPLETED',
        },
        include: { attendances: { select: { id: true } } },
      }),
      prisma.examPaper.groupBy({
        by: ['teacherId'],
        where: { teacherId: { in: teacherIds }, status: 'DRAFT' },
        _count: { id: true },
      }),
      prisma.teacherAlert.groupBy({
        by: ['teacherId'],
        where: { teacherId: { in: teacherIds }, isResolved: false },
        _count: { id: true },
      }),
    ])

    const logsByTeacher = groupBy(allLogs.filter((log) => log.teacherId), (log) => log.teacherId!)
    const lessonsByTeacher = groupBy(allLessons.filter((lesson) => lesson.teacherId), (lesson) => lesson.teacherId!)
    const draftPaperMap = new Map(allDraftPapers.filter((row) => row.teacherId).map((row) => [row.teacherId!, row._count.id]))
    const alertMap = new Map(allAlerts.filter((row) => row.teacherId).map((row) => [row.teacherId!, row._count.id]))

    const rows = teachers.map((teacher) => {
      const todayLogs = logsByTeacher.get(teacher.id) || []
      const todayLessons = lessonsByTeacher.get(teacher.id) || []
      const draftPapers = draftPaperMap.get(teacher.id) || 0
      const alerts = alertMap.get(teacher.id) || 0

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
    })

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
