import { NextRequest, NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'
import { qywxEnabled, getQywxGroupSendResult } from '@/lib/qywx'
import { createOverdueFeeAlerts } from '@/lib/overdue-fee-alerts'
import { createRenewalTermAlerts } from '@/lib/renewal-term-alerts'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { dispatchParentQywxNotifications } from '@/lib/parent-qywx-dispatch'

export const dynamic = 'force-dynamic'

/**
 * 企微家长群发状态轮询 + 失败重试。
 * - queued：安静两分钟后生成每位家长的一张学习与家校汇总卡，放入企微待确认任务。
 * - pending_confirm：按发送成员查询执行结果，只有企微返回已发送才标记 sent。
 * - failed：退避重试创建任务；同一个外部联系人每天最多创建一条任务。
 */
async function syncForDb(db: PrismaClient, now: number) {
  const results: Array<{ id: string; status: string; error?: string }> = []
  const qywxOn = qywxEnabled()

  await db.notification.updateMany({
    where: { pushStatus: 'processing', qywxProcessingAt: { lt: new Date(now - 10 * 60_000) } },
    data: { pushStatus: 'queued', qywxProcessingAt: null, pushError: '上次任务中断，已恢复重试' },
  })

  // 1) 轮询待确认的群发任务
  const pending = await db.notification.findMany({
    where: { pushStatus: 'pending_confirm', qywxMsgId: { not: null } },
    include: { user: { select: { qywxExternalUserId: true, qywxSenderUserId: true } } },
    take: 20,
  })
  const polledMessages = new Set<string>()
  for (const n of pending) {
    if (!qywxOn || !n.qywxMsgId) continue
    const senderUserId = n.qywxSenderUserId || n.user.qywxSenderUserId || process.env.QYWX_MASS_SENDER || ''
    if (!senderUserId) continue
    const messageKey = `${n.qywxMsgId}:${senderUserId}`
    if (polledMessages.has(messageKey)) continue
    polledMessages.add(messageKey)
    const externalUserId = n.qywxExternalUserId || n.user.qywxExternalUserId
    const res = await getQywxGroupSendResult(n.qywxMsgId, senderUserId)
    if (!res) continue // 查询失败，下次再试
    const sentRecord = res.sendList.find((item) => !externalUserId || item.external_userid === externalUserId)
    if (sentRecord?.status === 1) {
      await db.notification.updateMany({
        where: { qywxMsgId: n.qywxMsgId, pushStatus: 'pending_confirm' },
        data: { pushStatus: 'sent', pushError: null, lastError: null, sentAt: new Date() },
      })
      results.push({ id: n.id, status: 'sent' })
    } else if (sentRecord?.status === 2 || sentRecord?.status === 3) {
      const detail = sentRecord.status === 2 ? '该家长已不是该成员的企微联系人' : '该家长今日企微群发已达上限'
      await db.notification.updateMany({
        where: { qywxMsgId: n.qywxMsgId, pushStatus: 'pending_confirm' },
        data: { pushStatus: sentRecord.status === 3 ? 'limit_today' : 'failed', pushError: detail, lastError: detail },
      })
      results.push({ id: n.id, status: sentRecord.status === 3 ? 'limit_today' : 'failed', error: detail })
    }
  }

  // 2) Collect parent notices; the shared dispatcher keeps cron backoff and quiet-period behavior.
  const candidates = await db.notification.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      pushStatus: { in: ['queued', 'failed'] },
      attempts: { lt: 5 },
      qywxMsgId: null,
    },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
    take: 250,
  })
  const processedParents = new Set<string>()
  for (const candidate of candidates) {
    if (!qywxOn) break
    if (processedParents.has(candidate.userId)) continue
    processedParents.add(candidate.userId)
    const outcome = await dispatchParentQywxNotifications(db, candidate.userId, now)
    if (outcome.status === 'skipped' || outcome.status === 'disabled') continue
    for (const id of outcome.notificationIds) {
      results.push({ id, status: outcome.status, ...(outcome.error ? { error: outcome.error } : {}) })
    }
  }

  const overdueFeeAlerts = await createOverdueFeeAlerts(db, new Date(now))
  if (overdueFeeAlerts.notified > 0) {
    results.push({ id: 'overdue-fees', status: `notified:${overdueFeeAlerts.notified}` })
  }
  const renewalAlerts = await createRenewalTermAlerts(db, new Date(now))
  if (renewalAlerts.notified > 0) {
    results.push({ id: 'renewals', status: `notified:${renewalAlerts.notified}` })
  }

  return results
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedCronRequest(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()

  if (isDualDbEnabled()) {
    const [juniorResults, seniorResults] = await Promise.all([
      syncForDb(getPrismaForDivision('JUNIOR'), now),
      syncForDb(getPrismaForDivision('SENIOR'), now),
    ])
    return NextResponse.json({ processed: juniorResults.length + seniorResults.length, results: [...juniorResults, ...seniorResults] })
  }

  const results = await syncForDb(prisma, now)
  return NextResponse.json({ processed: results.length, results })
}
