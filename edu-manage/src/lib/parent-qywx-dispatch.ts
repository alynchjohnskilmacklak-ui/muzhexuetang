import type { Prisma, PrismaClient } from '@prisma/client'
import { buildParentDailyDigest } from '@/lib/daily-digest'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'
import { getParentDailyFeedbackReadiness } from '@/lib/qywx-daily-feedback'
import { qywxEnabled, sendQywxParentMass } from '@/lib/qywx'

export type ParentQywxDispatchStatus =
  | 'pending_confirm'
  | 'no_bind'
  | 'failed'
  | 'limit_today'
  | 'skipped'
  | 'disabled'
  | 'unknown'

export interface ParentQywxDispatchOutcome {
  parentUserId: string
  notificationIds: string[]
  status: ParentQywxDispatchStatus
  error?: string
}

interface DispatchOptions {
  /** Process queued rows immediately. Cron mode keeps its quiet period and retry backoff. */
  forceQueued?: boolean
}

/**
 * Claim and create this parent's daily WeCom digest task.
 * Cron mode preserves the existing two-minute quiet period and failed-row backoff;
 * web mode processes queued rows immediately after the admin submits a batch.
 */
export async function dispatchParentQywxNotifications(
  db: PrismaClient,
  parentUserId: string,
  now: number,
  options: DispatchOptions = {},
): Promise<ParentQywxDispatchOutcome> {
  const empty = (status: ParentQywxDispatchStatus, error?: string): ParentQywxDispatchOutcome => ({
    parentUserId,
    notificationIds: [],
    status,
    ...(error ? { error } : {}),
  })

  if (!qywxEnabled()) return empty('disabled', '企微通道未开启')

  const candidateWhere = {
    userId: parentUserId,
    status: 'ACTIVE',
    deletedAt: null,
    attempts: { lt: 5 },
    qywxMsgId: null,
  } satisfies Prisma.NotificationWhereInput
  const candidateInclude = {
    user: { select: { qywxExternalUserId: true, qywxSenderUserId: true } },
  } satisfies Prisma.NotificationInclude
  const candidateOrder = [{ createdAt: 'asc' }, { id: 'asc' }] satisfies Prisma.NotificationOrderByWithRelationInput[]

  const queuedRows = await db.notification.findMany({
    where: {
      ...candidateWhere,
      pushStatus: 'queued',
    },
    include: candidateInclude,
    // Keep the candidate slice identical for cron and web dispatch. If both
    // paths select different overlapping subsets, the timestamp-based claim
    // marker can make them mistake the same row for their own claim.
    orderBy: candidateOrder,
    take: 250,
  })

  // A fresh queued batch takes priority. This makes cron and the web action
  // claim exactly the same rows for a parent, while failed rows remain
  // eligible for cron retry once no queued rows are waiting.
  const dueFailedRows = options.forceQueued || queuedRows.length > 0
    ? []
    : (await db.notification.findMany({
      where: {
        ...candidateWhere,
        pushStatus: 'failed',
      },
      include: candidateInclude,
      orderBy: candidateOrder,
      take: 250,
    }))
      .filter((row) => (row.qywxProcessingAt || row.createdAt).getTime() + Math.min(60_000 * Math.pow(2, row.attempts), 30 * 60_000) <= now)
  if (queuedRows.length === 0 && dueFailedRows.length === 0) return empty('skipped')

  const latestQueuedAt = queuedRows.reduce((latest, row) => Math.max(latest, row.createdAt.getTime()), 0)
  if (!options.forceQueued && latestQueuedAt > 0 && now - latestQueuedAt < 2 * 60_000) return empty('skipped')

  const queuedIds = queuedRows.map((row) => row.id)
  const failedIds = dueFailedRows.map((row) => row.id)
  const claimIds = [...queuedIds, ...failedIds]
  const claimConditions: Prisma.NotificationWhereInput[] = []
  if (queuedIds.length > 0) claimConditions.push({ id: { in: queuedIds }, pushStatus: 'queued' })
  if (failedIds.length > 0) claimConditions.push({ id: { in: failedIds }, pushStatus: 'failed' })

  const processingAt = new Date(now)
  const claim = await db.notification.updateMany({
    where: {
      id: { in: claimIds },
      userId: parentUserId,
      status: 'ACTIVE',
      deletedAt: null,
      qywxMsgId: null,
      attempts: { lt: 5 },
      OR: claimConditions,
    },
    data: { pushStatus: 'processing', qywxProcessingAt: processingAt },
  })
  if (claim.count === 0) return empty('skipped')

  const claimedRows = await db.notification.findMany({
    where: {
      id: { in: claimIds },
      userId: parentUserId,
      status: 'ACTIVE',
      deletedAt: null,
      pushStatus: 'processing',
      qywxProcessingAt: processingAt,
    },
    include: {
      user: { select: { qywxExternalUserId: true, qywxSenderUserId: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  const claimedIds = claimedRows.map((row) => row.id)
  const firstClaimedRow = claimedRows[0]
  if (!firstClaimedRow) return empty('skipped')

  const claimedWhere: Prisma.NotificationWhereInput = {
    id: { in: claimedIds },
    userId: parentUserId,
    status: 'ACTIVE',
    deletedAt: null,
    pushStatus: 'processing',
    qywxProcessingAt: processingAt,
  }
  const outcome = (status: ParentQywxDispatchStatus, error?: string): ParentQywxDispatchOutcome => ({
    parentUserId,
    notificationIds: claimedIds,
    status,
    ...(error ? { error } : {}),
  })

  const boundRow = claimedRows.find((row) => row.user.qywxExternalUserId || row.user.qywxSenderUserId)
  const currentParent = boundRow || firstClaimedRow
  const externalId = currentParent.user.qywxExternalUserId || currentParent.qywxExternalUserId
  if (!externalId) {
    const detail = '家长账号尚未绑定企微联系人'
    await db.notification.updateMany({
      where: claimedWhere,
      data: { pushStatus: 'no_bind', qywxProcessingAt: null, pushError: detail, lastError: detail },
    })
    return outcome('no_bind', detail)
  }

  const sender = currentParent.user.qywxSenderUserId || currentParent.qywxSenderUserId || process.env.QYWX_MASS_SENDER || ''
  if (!sender) {
    const detail = '未配置企微发送成员（家长绑定或 QYWX_MASS_SENDER）'
    await db.notification.updateMany({
      where: claimedWhere,
      data: { pushStatus: 'failed', qywxProcessingAt: processingAt, pushError: detail, lastError: detail, attempts: { increment: 1 } },
    })
    return outcome('failed', detail)
  }

  const todayKey = localDateKey(new Date(now))
  const { start: todayStart, end: todayEnd } = getLocalDayRange(todayKey)
  const existingMass = await db.notification.findFirst({
    where: {
      id: { notIn: claimedIds },
      qywxExternalUserId: externalId,
      qywxMsgId: { not: null },
      OR: [
        { qywxProcessingAt: { gte: todayStart, lt: todayEnd } },
        { qywxProcessingAt: null, createdAt: { gte: todayStart, lt: todayEnd } },
      ],
    },
    select: { id: true },
  })
  if (existingMass) {
    const detail = '今日已有企微群发任务，本批内容未进入微信卡片；请在家长端查看'
    await db.notification.updateMany({
      where: claimedWhere,
      data: { pushStatus: 'limit_today', qywxProcessingAt: null, pushError: detail, lastError: detail },
    })
    return outcome('limit_today', detail)
  }

  const readiness = await getParentDailyFeedbackReadiness(db, parentUserId, todayKey, new Date(now))
  const pendingTeacherActionCount = readiness.pendingAttendanceCount + readiness.pendingFeedbackCount
  const digest = await buildParentDailyDigest(db, parentUserId, todayKey, pendingTeacherActionCount)
  if (!digest) {
    const detail = '没有找到家长可见的已发布内容，未创建企微任务'
    await db.notification.updateMany({
      where: claimedWhere,
      data: { pushStatus: 'failed', qywxProcessingAt: processingAt, pushError: detail, lastError: detail, attempts: { increment: 1 } },
    })
    return outcome('failed', detail)
  }

  const result = await sendQywxParentMass(sender, [externalId], digest)
  if (!result.success || !result.msgid) {
    const detail = result.error || '群发创建失败'
    const status = result.failedExternalUserIds?.includes(externalId) ? 'no_bind' : 'failed'
    await db.notification.updateMany({
      where: claimedWhere,
      data: {
        pushStatus: status,
        qywxProcessingAt: processingAt,
        attempts: { increment: 1 },
        lastError: detail,
        pushError: detail,
      },
    })
    return outcome(status, detail)
  }

  try {
    const saved = await db.notification.updateMany({
      where: claimedWhere,
      data: {
        pushStatus: 'pending_confirm',
        // Preserve the successful task-creation time for the daily limit check.
        // Stale-processing recovery is scoped to pushStatus === 'processing'.
        qywxProcessingAt: processingAt,
        qywxMsgId: result.msgid,
        qywxExternalUserId: externalId,
        qywxSenderUserId: sender,
        pushError: '已创建企微群发任务，需发送成员在企微群发助手中确认',
        lastError: null,
        attempts: { increment: 1 },
      },
    })
    if (saved.count !== claimedIds.length) {
      return outcome('unknown', '企微已返回任务编号，但本地状态回写不完整；请先在企微群发助手核对，勿重复创建')
    }
  } catch {
    return outcome('unknown', '企微已返回任务编号，但本地状态未能确认；请先在企微群发助手核对，勿重复创建')
  }

  return outcome('pending_confirm')
}
