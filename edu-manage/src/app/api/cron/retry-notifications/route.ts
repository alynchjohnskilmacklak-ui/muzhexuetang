import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWxMessage, buildFeedbackContent, buildSafeHomeContent } from '@/lib/wxpusher'

export const dynamic = 'force-dynamic'

const MAX_RETRIES = 5
const BASE_DELAY_MS = 60_000 // 1 minute

function backoffDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30 * 60_000)
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (token !== process.env.CRON_SECRET && token !== process.env.HEALTH_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const failedNotifications = await prisma.notification.findMany({
    where: {
      pushStatus: 'failed',
      attempts: { lt: MAX_RETRIES },
      type: { in: ['wxpusher_feedback', 'wxpusher_safe'] },
    },
    include: { student: { include: { parent: { select: { wxpusherUid: true } } } } },
    orderBy: { sentAt: { sort: 'asc', nulls: 'first' } },
    take: 20,
  })

  const results: Array<{ id: string; status: string; error?: string }> = []

  for (const n of failedNotifications) {
    const nextAttemptAt = n.sentAt
      ? new Date(n.sentAt.getTime() + backoffDelay(n.attempts))
      : new Date(0)

    if (nextAttemptAt.getTime() > now) continue

    const wxpusherUid = n.student?.parent?.wxpusherUid
    if (!wxpusherUid) {
      await prisma.notification.update({
        where: { id: n.id },
        data: { pushStatus: 'no_bind', pushError: '家长未绑定微信', lastError: '家长未绑定微信' },
      })
      results.push({ id: n.id, status: 'no_bind' })
      continue
    }

    const msgContent = n.type === 'wxpusher_safe'
      ? buildSafeHomeContent(n.student?.name || '')
      : buildFeedbackContent(n.student?.name || '')
    const summary = n.type === 'wxpusher_safe' ? '平安回家通知' : '课堂反馈通知'

    const result = await sendWxMessage(wxpusherUid, msgContent, summary)

    if (result.success) {
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          pushStatus: 'sent',
          pushError: null,
          attempts: { increment: 1 },
          sentAt: new Date(),
          lastError: null,
        },
      })
      results.push({ id: n.id, status: 'sent' })
    } else {
      const newAttempts = n.attempts + 1
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          attempts: newAttempts,
          lastError: result.error || null,
          pushError: newAttempts >= MAX_RETRIES ? `已达最大重试次数(${MAX_RETRIES}): ${result.error || ''}` : result.error || null,
          pushStatus: newAttempts >= MAX_RETRIES ? 'failed' : 'failed',
        },
      })
      results.push({ id: n.id, status: 'failed', error: result.error })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
