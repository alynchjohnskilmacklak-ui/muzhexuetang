import { NextRequest, NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'
import { sendWxMessage, buildPushPayload } from '@/lib/wxpusher'
import { qywxEnabled, sendQywxParentNotice } from '@/lib/qywx'

export const dynamic = 'force-dynamic'

const MAX_RETRIES = 5
const BASE_DELAY_MS = 60_000 // 1 minute

function backoffDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30 * 60_000)
}

async function retryForDb(db: PrismaClient, now: number) {
  const failedNotifications = await db.notification.findMany({
    where: {
      pushStatus: 'failed',
      attempts: { lt: MAX_RETRIES },
      type: { in: ['wxpusher_feedback', 'wxpusher_safe'] },
    },
    include: {
      student: { include: { parent: { select: { wxpusherUid: true, qywxExternalUserId: true } } } },
    },
    orderBy: { sentAt: { sort: 'asc', nulls: 'first' } },
    take: 20,
  })

  const results: Array<{ id: string; status: string; error?: string }> = []

  for (const n of failedNotifications) {
    const nextAttemptAt = n.sentAt
      ? new Date(n.sentAt.getTime() + backoffDelay(n.attempts))
      : new Date(0)

    if (nextAttemptAt.getTime() > now) continue

    const parent = n.student?.parent
    const wxpusherUid = parent?.wxpusherUid
    const qywxExternalUserId = parent?.qywxExternalUserId
    if (!wxpusherUid && !(qywxEnabled() && qywxExternalUserId)) {
      await db.notification.update({
        where: { id: n.id },
        data: { pushStatus: 'no_bind', pushError: '家长未绑定微信/企业微信', lastError: '家长未绑定微信/企业微信' },
      })
      results.push({ id: n.id, status: 'no_bind' })
      continue
    }

    const { content: msgContent, summary } = buildPushPayload(n.type, n.student?.name || '')
    const studentName = n.student?.name || ''
    // 家长通道 URL（微信内点开直达对应页面）
    const parentUrl =
      n.href && n.href.startsWith('/')
        ? `https://muzhexuetang.xyz${n.href}`
        : n.href || `https://muzhexuetang.xyz/parent/notifications`

    // 双通道并行：企业微信（学校通知） + 微信个人号（wxpusher），任一成功即视为已送达
    const jobs: Promise<{ ok: boolean; error?: string }>[] = []
    if (qywxEnabled() && qywxExternalUserId) {
      jobs.push(
        sendQywxParentNotice(qywxExternalUserId, {
          title: `${summary}：${studentName}`,
          desc: msgContent,
          url: parentUrl,
        }).then((r) => ({ ok: r.success, error: r.error })),
      )
    }
    if (wxpusherUid) {
      jobs.push(sendWxMessage(wxpusherUid, msgContent, summary).then((r) => ({ ok: r.success, error: r.error })))
    }

    const settled = await Promise.all(jobs)
    const anyOk = settled.some((r) => r.ok)
    const errors = settled.filter((r) => !r.ok).map((r) => r.error).filter(Boolean)

    if (anyOk) {
      await db.notification.update({
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
      const detail = errors.length ? errors.join('; ') : '发送失败'
      await db.notification.update({
        where: { id: n.id },
        data: {
          attempts: newAttempts,
          lastError: detail,
          pushError: newAttempts >= MAX_RETRIES ? `已达最大重试次数(${MAX_RETRIES}): ${detail}` : detail,
          pushStatus: newAttempts >= MAX_RETRIES ? 'failed' : 'failed',
        },
      })
      results.push({ id: n.id, status: 'failed', error: detail })
    }
  }

  return results
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (token !== process.env.CRON_SECRET && token !== process.env.HEALTH_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()

  if (isDualDbEnabled()) {
    const [juniorResults, seniorResults] = await Promise.all([
      retryForDb(getPrismaForDivision('JUNIOR'), now),
      retryForDb(getPrismaForDivision('SENIOR'), now),
    ])
    return NextResponse.json({ processed: juniorResults.length + seniorResults.length, results: [...juniorResults, ...seniorResults] })
  }

  const results = await retryForDb(prisma, now)
  return NextResponse.json({ processed: results.length, results })
}
