import { NextResponse } from 'next/server'
import { getTeacherDashboardData } from '@/lib/teacher-dashboard'
import { requireCurrentTeacher, TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  try {
    const { user, teacher, prisma } = await requireCurrentTeacher()
    const [dashboard, teacherMessageUnreadCount, notificationUnreadCount] = await Promise.all([
      getTeacherDashboardData(teacher.id, prisma, user.id),
      prisma.teacherMessage.count({ where: { teacherId: teacher.id, readAt: null } }),
      // Parent-message notifications are represented by the conversation unread count in the layout.
      // Exclude them here so the combined navigation badge does not double count the same work.
      prisma.notification.count({ where: { userId: user.id, status: 'ACTIVE', deletedAt: null, read: false, type: { not: 'PARENT_MESSAGE' } } }),
    ])

    return NextResponse.json({
      teacher: { id: teacher.id, name: teacher.name, gender: teacher.gender, avatar: teacher.avatar, subjects: teacher.subjects, tierLevel: teacher.tierLevel },
      ...dashboard,
      badges: {
        unsubmitted: dashboard.pendingTasks.unsubmittedAttendance,
        unpublished: dashboard.pendingTasks.unpublishedPapers,
        unread: dashboard.pendingTasks.unreadParentComments,
        unreadMessages: teacherMessageUnreadCount + notificationUnreadCount,
      },
    }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
})

export const POST = apiHandler(async () => {
  try {
    const { user, teacher, prisma } = await requireCurrentTeacher()
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        teacherId: teacher.id,
        action: TEACHER_LOG_ACTIONS.TEACHER_LOGIN,
        detail: '教师登录工作台',
        entityType: 'Teacher',
        entityId: teacher.id,
      },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
})
