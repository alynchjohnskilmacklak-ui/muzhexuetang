import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { getAccessibleParentMessageWhere } from '@/lib/parent-message-access'
import { resolveUserForTeacher } from '@/lib/teacher-account-binding'

export const dynamic = 'force-dynamic'

const REMINDER_COOLDOWN_MS = 15 * 60 * 1000

export const POST = apiHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const { id } = await params
  const accessWhere = await getAccessibleParentMessageWhere(prisma, user, user.division)
  if (!accessWhere) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const message = await prisma.parentMessage.findFirst({
    where: { AND: [{ id }, accessWhere] },
    select: {
      id: true,
      title: true,
      status: true,
      teacherId: true,
      studentId: true,
      student: { select: { name: true } },
    },
  })
  if (!message) return NextResponse.json({ error: '留言不存在' }, { status: 404 })
  if (message.status === 'CLOSED') {
    return NextResponse.json({ error: '已关闭的会话不能督促' }, { status: 400 })
  }
  if (!message.teacherId) {
    return NextResponse.json({ error: '该留言尚未匹配教师，请先检查任课关系' }, { status: 400 })
  }

  const teacherAccount = await resolveUserForTeacher(prisma, message.teacherId)
  if (!teacherAccount) {
    return NextResponse.json({ error: '未找到可接收提醒的教师账号' }, { status: 400 })
  }

  const recentReminder = await prisma.notification.findFirst({
    where: {
      userId: teacherAccount.id,
      type: 'PARENT_MESSAGE_REMINDER',
      relatedType: 'PARENT_MESSAGE',
      relatedId: message.id,
      createdAt: { gte: new Date(Date.now() - REMINDER_COOLDOWN_MS) },
    },
    select: { id: true },
  })
  if (recentReminder) {
    return NextResponse.json({
      reminded: false,
      message: '15分钟内已经提醒过该教师，请稍后再试。',
    })
  }

  await prisma.$transaction([
    prisma.notification.create({
      data: {
        userId: teacherAccount.id,
        senderId: user.id,
        studentId: message.studentId,
        type: 'PARENT_MESSAGE_REMINDER',
        title: '管理员提醒您回复家长',
        content: message.student?.name
          ? `请及时处理${message.student.name}家长的留言：“${message.title}”。`
          : `请及时处理家长留言：“${message.title}”。`,
        link: '/teacher/messages',
        href: '/teacher/messages',
        relatedType: 'PARENT_MESSAGE',
        relatedId: message.id,
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: user.id,
        action: '督促教师回复家长留言',
        detail: `${message.student?.name || '未关联学生'} - ${message.title}`,
        entityType: 'ParentMessage',
        entityId: message.id,
      },
    }),
  ])

  return NextResponse.json({ reminded: true })
})
