import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher, teacherStudentWhere } from '@/lib/teacher-portal'

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const session = await auth()
  if (!session?.user || !['admin', 'teacher'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const userId = (session.user as { id: string }).id

  const role = (session.user as any).role
  const body = await req.json()
  const { status, replyNote } = body as { status: 'approved' | 'rejected'; replyNote?: string }

  if (!status || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: '无效的状态' }, { status: 400 })
  }

  const teacherScope = role === 'teacher'
    ? { student: teacherStudentWhere((await requireCurrentTeacher()).teacher.id) }
    : {}

  const target = await prisma.leaveRequest.findFirst({
    where: { id, ...teacherScope },
    select: { id: true },
  })
  if (!target) {
    return NextResponse.json({ error: '请假申请不存在或无权限处理' }, { status: 404 })
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: target.id },
    data: {
      status,
      replyNote: replyNote || null,
      repliedAt: new Date(),
      repliedBy: userId,
    },
    include: {
      student: { select: { id: true, name: true, parentId: true, parentUserId: true } },
      schedule: { select: { id: true, startTime: true, course: { select: { name: true } } } },
    },
  })

  const parentUserId = updated.student.parentId || updated.student.parentUserId
  if (parentUserId) {
    await prisma.notification.create({
      data: {
        userId: parentUserId,
        title: status === 'approved' ? '请假申请已批准' : '请假申请未通过',
        content: `${updated.student.name} ${new Date(updated.leaveDate).toLocaleDateString('zh-CN')} 的请假申请${status === 'approved' ? '已批准' : '未通过'}。${replyNote ? `回执：${replyNote}` : ''}`,
        type: 'leave',
        studentId: updated.student.id,
        senderId: userId,
        relatedType: 'LEAVE_REQUEST',
        relatedId: updated.id,
        pushStatus: 'none',
      },
    })
  }

  await prisma.activityLog.create({
    data: {
      userId,
      action: status === 'approved' ? '批准请假' : '拒绝请假',
      detail: `${updated.student.name} - ${updated.reason}`,
      entityType: 'LeaveRequest',
      entityId: id,
    },
  })

  return NextResponse.json(updated)
})
