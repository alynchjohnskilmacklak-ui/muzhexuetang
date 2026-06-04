import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { chineseToPinyin } from '@/lib/pinyin'
import { apiHandler } from '@/lib/api-handler'

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const { studentId, scheduleId, reason, leaveDate } = await req.json() as {
    studentId: string
    scheduleId?: string
    reason: string
    leaveDate: string
  }

  if (!studentId || !reason || !leaveDate) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { mainTeacher: { select: { id: true, name: true } } },
  })
  if (!student || student.parentId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      studentId,
      scheduleId: scheduleId || null,
      reason,
      leaveDate: new Date(leaveDate),
      status: 'pending',
      replyNote: '已提交，等待老师审批',
    },
    include: {
      student: { select: { name: true } },
      schedule: { include: { course: { select: { name: true } } } },
    },
  })

  const admins = await prisma.user.findMany({
    where: { role: 'admin', status: 'active' },
    select: { id: true },
  })
  const notificationTitle = `请假通知：${student.name}`
  const notificationContent = `${student.name} 于 ${new Date(leaveDate).toLocaleDateString('zh-CN')} 请假，原因：${reason}`

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: notificationTitle,
        content: notificationContent,
        type: 'leave',
        studentId,
        senderId: userId,
        pushStatus: 'none',
      })),
    })
  }

  if (student.mainTeacher) {
    const teacherEmail = `${chineseToPinyin(student.mainTeacher.name)}@tea.com`
    const teacherUser = await prisma.user.findUnique({ where: { email: teacherEmail } })
    if (teacherUser) {
      await prisma.notification.create({
        data: {
          userId: teacherUser.id,
          title: notificationTitle,
          content: notificationContent,
          type: 'leave',
          studentId,
          senderId: userId,
          pushStatus: 'none',
        },
      })
    }
  }

  await prisma.activityLog.create({
    data: {
      userId,
      action: '请假通知',
      detail: `${student.name} - ${reason}`,
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
    },
  })

  return NextResponse.json({
    id: leaveRequest.id,
    studentName: leaveRequest.student.name,
    courseName: leaveRequest.schedule?.course?.name || '未指定课程',
    leaveDate: leaveRequest.leaveDate.toISOString(),
    reason: leaveRequest.reason,
    status: leaveRequest.status,
    replyNote: leaveRequest.replyNote,
    createdAt: leaveRequest.createdAt.toISOString(),
  }, { status: 201 })
})
