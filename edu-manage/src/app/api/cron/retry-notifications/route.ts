import { NextRequest, NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'
import { qywxEnabled, getQywxGroupSendResult, sendQywxParentMass } from '@/lib/qywx'
import { buildDailyDigest } from '@/lib/daily-digest'

export const dynamic = 'force-dynamic'

/**
 * 企微家长群发状态轮询 + 失败重试。
 * - pending_confirm：查询 externalcontact/get_group_send_result，确认后置 sent；
 *   若已确认且发送失败（fail_list / 已达上限）则标记对应状态。
 * - failed（群发创建失败）：退避后重试创建；同日内已达上限的任务不再重试。
 */
async function syncForDb(db: PrismaClient, now: number) {
  const results: Array<{ id: string; status: string; error?: string }> = []
  const qywxOn = qywxEnabled()

  // 1) 轮询待确认的群发任务
  const pending = await db.notification.findMany({
    where: { pushStatus: 'pending_confirm', qywxMsgId: { not: null } },
    take: 20,
  })
  for (const n of pending) {
    if (!qywxOn || !n.qywxMsgId) continue
    const res = await getQywxGroupSendResult(n.qywxMsgId)
    if (!res) continue // 查询失败，下次再试
    if (res.status === 'sent') {
      await db.notification.update({
        where: { id: n.id },
        data: { pushStatus: 'sent', pushError: null, lastError: null, sentAt: new Date() },
      })
      results.push({ id: n.id, status: 'sent' })
    } else if (res.failList && res.failList.length > 0) {
      await db.notification.update({
        where: { id: n.id },
        data: { pushStatus: 'failed', pushError: `企微确认后发送失败(${res.failList.length}人未达)` },
      })
      results.push({ id: n.id, status: 'failed' })
    }
  }

  // 2) 创建失败的任务退避重试（排除同日已达上限）
  const failed = await db.notification.findMany({
    where: {
      pushStatus: 'failed',
      attempts: { lt: 5 },
      qywxMsgId: null,
      senderId: { not: null },
    },
    include: {
      student: { include: { parent: { select: { qywxExternalUserId: true, qywxSenderUserId: true } } } },
    },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })
  for (const n of failed) {
    if (!qywxOn) break
    const nextAttemptAt = n.createdAt
      ? new Date(n.createdAt.getTime() + Math.min(60_000 * Math.pow(2, n.attempts), 30 * 60_000))
      : new Date(0)
    if (nextAttemptAt.getTime() > now) continue

    const parent = n.student?.parent
    const externalId = parent?.qywxExternalUserId
    if (!externalId) {
      await db.notification.update({
        where: { id: n.id },
        data: { pushStatus: 'no_bind', pushError: '家长微信未添加为企微学员', lastError: '家长微信未添加为企微学员' },
      })
      results.push({ id: n.id, status: 'no_bind' })
      continue
    }

    // 同日已达上限：直接标记，不消耗重试次数
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const existingMass = await db.notification.findFirst({
      where: { studentId: n.studentId!, qywxMsgId: { not: null }, createdAt: { gte: todayStart } },
      select: { id: true },
    })
    if (existingMass) {
      await db.notification.update({
        where: { id: n.id },
        data: { pushStatus: 'merged_today', pushError: '今日已并入企微汇总卡片', lastError: '今日已并入企微汇总卡片' },
      })
      results.push({ id: n.id, status: 'merged_today' })
      continue
    }

    const studentName = n.student?.name || ''
    const digest = await buildDailyDigest(db, n.studentId!, studentName)
    const sender = parent?.qywxSenderUserId || process.env.QYWX_MASS_SENDER || 'RenWenTao'
    const retry = await sendQywxParentMass(sender, [externalId], digest)
    if (retry.success && retry.msgid) {
      await db.notification.update({
        where: { id: n.id },
        data: { pushStatus: 'pending_confirm', qywxMsgId: retry.msgid, pushError: '已重新生成群发任务，待企微确认', attempts: { increment: 1 } },
      })
      results.push({ id: n.id, status: 'pending_confirm' })
    } else {
      const newAttempts = n.attempts + 1
      const detail = retry.error || '群发创建失败'
      await db.notification.update({
        where: { id: n.id },
        data: { attempts: newAttempts, lastError: detail, pushError: newAttempts >= 5 ? `已达最大重试次数(5): ${detail}` : detail },
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
      syncForDb(getPrismaForDivision('JUNIOR'), now),
      syncForDb(getPrismaForDivision('SENIOR'), now),
    ])
    return NextResponse.json({ processed: juniorResults.length + seniorResults.length, results: [...juniorResults, ...seniorResults] })
  }

  const results = await syncForDb(prisma, now)
  return NextResponse.json({ processed: results.length, results })
}
