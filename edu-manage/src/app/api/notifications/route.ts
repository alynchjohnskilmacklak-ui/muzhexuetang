import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { sendWxMessage, buildFeedbackContent, buildSafeHomeContent } from '@/lib/wxpusher'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
 
  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, searchParams.get('division'))

  const [records, total] = await Promise.all([
    prisma.notification.findMany({
      where: { senderId: { not: null }, ...visibleNotificationWhere, student: { division } },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { senderId: { not: null }, ...visibleNotificationWhere, student: { division } } }),
  ])
  return NextResponse.json({ records, total })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || !['admin', 'teacher'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()
  const senderId = (session.user as { id: string }).id

  const body = await req.json()
  const { studentId, title, content, type } = body as {
    studentId: string; title: string; content: string;
    type: 'system' | 'wxpusher_feedback' | 'wxpusher_safe'
  }

  if (!studentId || !type || (type === 'system' && (!title || !content))) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId },
    include: { parent: { select: { id: true, wxpusherUid: true } } },
  })
  if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  const parentUserId = student.parent?.id || student.parentId || student.parentUserId
  const wxpusherUid = student.parent?.wxpusherUid

  let pushStatus = 'none'
  let pushError: string | null = null
  const notificationTitle = type === 'wxpusher_feedback'
    ? '课堂反馈通知'
    : type === 'wxpusher_safe'
      ? '平安回家通知'
      : title
  const notificationContent = type === 'wxpusher_feedback'
    ? buildFeedbackContent(student.name)
    : type === 'wxpusher_safe'
      ? buildSafeHomeContent(student.name)
      : content

  // Create notification record
  const notification = await prisma.notification.create({
    data: {
      userId: parentUserId || senderId,
      title: notificationTitle,
      content: notificationContent,
      type,
      studentId: student.id,
      senderId,
      pushStatus: 'none',
    },
  })

  // Handle WxPusher push
  if (type === 'wxpusher_feedback' || type === 'wxpusher_safe') {
    if (!wxpusherUid) {
      pushStatus = 'no_bind'
    } else {
      const msgContent = type === 'wxpusher_feedback'
        ? buildFeedbackContent(student.name)
        : buildSafeHomeContent(student.name)
      const summary = type === 'wxpusher_feedback' ? '课堂反馈通知' : '平安回家通知'
      const result = await sendWxMessage(wxpusherUid, msgContent, summary)
      if (result.success) {
        pushStatus = 'sent'
      } else {
        pushStatus = 'failed'
        pushError = result.error || null
      }
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { pushStatus, pushError },
    })
  }

  // Activity log
  await prisma.activityLog.create({
    data: {
      userId: senderId,
      action: '发送通知',
      detail: `${student.name} - ${notificationTitle}`,
      entityType: 'Notification',
      entityId: notification.id,
    },
  })

  return NextResponse.json({ ...notification, pushStatus, pushError }, { status: 201 })
})
