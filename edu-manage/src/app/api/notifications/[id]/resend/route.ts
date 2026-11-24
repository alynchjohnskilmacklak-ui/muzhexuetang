import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { sendWxMessage, buildPushPayload } from '@/lib/wxpusher'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { qywxEnabled } from '@/lib/qywx'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const prisma = await getRequestPrisma()
  const { id } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const notification = await prisma.notification.findFirst({
    where: { id, ...visibleNotificationWhere },
    include: {
      user: { select: { id: true, qywxExternalUserId: true, qywxSenderUserId: true, wxpusherUid: true } },
      student: { include: { parent: { select: { id: true, qywxExternalUserId: true, qywxSenderUserId: true, wxpusherUid: true } } } },
    },
  })
  if (!notification || notification.pushStatus === 'none') {
    return NextResponse.json({ error: '无法重发' }, { status: 400 })
  }

  if (qywxEnabled()) {
    if (notification.qywxMsgId) {
      return NextResponse.json({ error: '该通知已关联企微任务，请先在企微群发助手核对；为避免重复创建，本次不重发' }, { status: 409 })
    }
    const externalUserId = notification.qywxExternalUserId
      || notification.user.qywxExternalUserId
      || notification.student?.parent?.qywxExternalUserId
    const senderUserId = notification.qywxSenderUserId
      || notification.user.qywxSenderUserId
      || notification.student?.parent?.qywxSenderUserId
      || process.env.QYWX_MASS_SENDER
    if (!externalUserId) return NextResponse.json({ error: '家长未绑定企微联系人' }, { status: 400 })
    if (!senderUserId) return NextResponse.json({ error: '未配置企微发送成员' }, { status: 400 })

    const { start, end } = getLocalDayRange(localDateKey(new Date()))
    const existing = await prisma.notification.findFirst({
      where: {
        id: { not: id },
        qywxExternalUserId: externalUserId,
        qywxMsgId: { not: null },
        OR: [
          { qywxProcessingAt: { gte: start, lt: end } },
          { qywxProcessingAt: null, createdAt: { gte: start, lt: end } },
        ],
      },
      select: { id: true },
    })
    if (existing) return NextResponse.json({ error: '该家长今日已有企微群发任务，本次没有重发' }, { status: 409 })

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        pushStatus: 'queued',
        pushError: '已重新加入企微汇总队列；任务创建后需由发送成员在企微群发助手手动确认',
        qywxMsgId: null,
        qywxExternalUserId: null,
        qywxSenderUserId: null,
        qywxProcessingAt: null,
        attempts: 0,
        sentAt: null,
        lastError: null,
      },
    })
    return NextResponse.json(updated)
  }

  const wxpusherUid = notification.student?.parent?.wxpusherUid || notification.user.wxpusherUid
  if (!wxpusherUid) {
    return NextResponse.json({ error: '家长未绑定微信' }, { status: 400 })
  }

  const { content: msgContent, summary } = buildPushPayload(notification.type, notification.student?.name || '')

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
