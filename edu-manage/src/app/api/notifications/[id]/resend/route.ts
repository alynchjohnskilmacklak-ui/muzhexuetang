import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { sendWxMessage, buildFeedbackContent, buildSafeHomeContent } from '@/lib/wxpusher'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const prisma = await getRequestPrisma()
  const { id } = await params
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const notification = await prisma.notification.findFirst({
    where: { id, ...visibleNotificationWhere },
    include: { student: { include: { parent: { select: { wxpusherUid: true } } } } },
  })
  if (!notification || notification.pushStatus === 'none') {
    return NextResponse.json({ error: '无法重发' }, { status: 400 })
  }

  const wxpusherUid = notification.student?.parent?.wxpusherUid
  if (!wxpusherUid) {
    return NextResponse.json({ error: '家长未绑定微信' }, { status: 400 })
  }

  const msgContent = notification.type === 'wxpusher_safe'
    ? buildSafeHomeContent(notification.student?.name || '')
    : buildFeedbackContent(notification.student?.name || '')
  const summary = notification.type === 'wxpusher_safe' ? '平安回家通知' : '课堂反馈通知'

  const result = await sendWxMessage(wxpusherUid, msgContent, summary)
  const updated = await prisma.notification.update({
    where: { id },
    data: {
      pushStatus: result.success ? 'sent' : 'failed',
      pushError: result.success ? null : (result.error || null),
      attempts: { increment: 1 },
      sentAt: result.success ? new Date() : undefined,
      lastError: result.success ? null : (result.error || null),
    },
  })

  return NextResponse.json(updated)
})
