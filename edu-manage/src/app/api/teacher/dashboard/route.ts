import { NextResponse } from 'next/server'
import { getTeacherDashboardData } from '@/lib/teacher-dashboard'
import { requireCurrentTeacher, TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  try {
    const { teacher, prisma } = await requireCurrentTeacher()
    const dashboard = await getTeacherDashboardData(teacher.id)

    return NextResponse.json({
      teacher: { id: teacher.id, name: teacher.name, avatar: teacher.avatar, subjects: teacher.subjects },
      ...dashboard,
      badges: {
        unsubmitted: dashboard.pendingTasks.unsubmittedAttendance,
        unpublished: dashboard.pendingTasks.unpublishedPapers,
        unread: dashboard.pendingTasks.unreadParentComments,
        unreadMessages: 0,
      },
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
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
