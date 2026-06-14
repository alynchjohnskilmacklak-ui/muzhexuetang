import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ teacherId: string }> }) {
  try {
    const { prisma } = await requireAdminUser()
    const { teacherId } = await params
    const period = request.nextUrl.searchParams.get('period') || 'month'
    const now = new Date()
    const periodStart = period === 'week'
      ? new Date(now.getTime() - 7 * 86400000)
      : new Date(now.getFullYear(), now.getMonth(), 1)

    const [teacher, logs, alerts, lessons, comments] = await Promise.all([
      prisma.teacher.findUnique({ where: { id: teacherId } }),
      prisma.activityLog.findMany({
        where: { teacherId, createdAt: { gte: periodStart } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.teacherAlert.findMany({ where: { teacherId }, orderBy: { createdAt: 'desc' } }),
      prisma.classLesson.findMany({
        where: { teacherId, lessonDate: { gte: periodStart }, status: 'COMPLETED' },
        include: { attendances: true },
      }),
      prisma.paperComment.findMany({
        where: { paper: { teacherId }, createdAt: { gte: periodStart }, author: { role: 'parent' } },
        select: { id: true, isRead: true },
      }),
    ])

    if (!teacher) return NextResponse.json({ error: '教师不存在' }, { status: 404 })

    const attendanceDone = lessons.filter((lesson) => lesson.attendances.length > 0).length
    const loginDays = new Set(logs.filter((log) => log.action === TEACHER_LOG_ACTIONS.TEACHER_LOGIN).map((log) => log.createdAt.toISOString().slice(0, 10))).size
    const repliedComments = comments.filter((comment) => comment.isRead).length

    const stats = {
      totalLogs: logs.length,
      attendanceRate: lessons.length ? Math.round((attendanceDone / lessons.length) * 100) : 100,
      papersPublished: logs.filter((log) => log.action === TEACHER_LOG_ACTIONS.PAPER_PUBLISH).length,
      paperDrafts: logs.filter((log) => log.action === TEACHER_LOG_ACTIONS.PAPER_UPLOAD).length,
      performancePosts: logs.filter((log) => log.action === TEACHER_LOG_ACTIONS.PERFORMANCE_POST).length,
      commentReplyRate: comments.length ? Math.round((repliedComments / comments.length) * 100) : 100,
      loginDays,
    }

    return NextResponse.json({
      teacher: { id: teacher.id, name: teacher.name, avatar: teacher.avatar, subjects: teacher.subjects, phone: teacher.phone },
      stats,
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        detail: log.detail,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
      alerts: alerts.map((alert) => ({
        id: alert.id,
        type: alert.type,
        message: alert.message,
        isResolved: alert.isResolved,
        createdAt: alert.createdAt.toISOString(),
      })),
    })
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}
