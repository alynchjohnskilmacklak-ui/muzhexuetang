import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { getRequestPrisma } from '@/lib/prisma'
import { dispatchParentQywxNotifications } from '@/lib/parent-qywx-dispatch'
import { qywxEnabled } from '@/lib/qywx'

export const dynamic = 'force-dynamic'

const MAX_NOTIFICATION_IDS = 1000
const MAX_PARENTS_PER_REQUEST = 20

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  if (!qywxEnabled()) {
    return NextResponse.json({ error: '企微通道未开启，通知仍保留在网页队列中' }, { status: 503 })
  }

  const body = await req.json().catch(() => null) as { notificationIds?: unknown } | null
  const rawIds = body?.notificationIds
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return NextResponse.json({ error: '请提供待处理的通知记录' }, { status: 400 })
  }
  if (rawIds.length > MAX_NOTIFICATION_IDS) {
    return NextResponse.json({ error: `单次最多处理 ${MAX_NOTIFICATION_IDS} 条通知` }, { status: 413 })
  }
  if (rawIds.some((id) => typeof id !== 'string' || !id.trim() || id.length > 128)) {
    return NextResponse.json({ error: '通知记录编号无效' }, { status: 400 })
  }
  const notificationIds = [...new Set((rawIds as string[]).map((id) => id.trim()))]

  const db = await getRequestPrisma()
  const queuedRows = await db.notification.findMany({
    where: {
      id: { in: notificationIds },
      pushStatus: 'queued',
      ...visibleNotificationWhere,
    },
    select: { id: true, userId: true },
    orderBy: { createdAt: 'asc' },
  })

  const idsByParent = new Map<string, string[]>()
  for (const row of queuedRows) {
    const existing = idsByParent.get(row.userId) || []
    existing.push(row.id)
    idsByParent.set(row.userId, existing)
  }
  const parentGroups = [...idsByParent.entries()].map(([parentUserId, ids]) => ({ parentUserId, ids }))
  const processGroups = parentGroups.slice(0, MAX_PARENTS_PER_REQUEST)
  const remainingNotificationIds = parentGroups
    .slice(MAX_PARENTS_PER_REQUEST)
    .flatMap((group) => group.ids)
  const results: Array<{ notificationIds: string[]; status: string; error?: string }> = []

  for (const group of processGroups) {
    try {
      const outcome = await dispatchParentQywxNotifications(db, group.parentUserId, Date.now(), { forceQueued: true })
      results.push({
        notificationIds: outcome.notificationIds.length ? outcome.notificationIds : group.ids,
        status: outcome.status,
        ...(outcome.error ? { error: outcome.error } : {}),
      })
      if (outcome.status !== 'skipped' && outcome.status !== 'unknown') {
        const claimedIds = new Set(outcome.notificationIds)
        remainingNotificationIds.push(...group.ids.filter((id) => !claimedIds.has(id)))
      }
    } catch {
      results.push({
        notificationIds: group.ids,
        status: 'unknown',
        error: '处理结果未能完整写回；请刷新通知记录，若企微任务可能已创建，请先到企微群发助手核对再重试',
      })
    }
  }

  return NextResponse.json({
    processedParents: processGroups.length,
    results,
    remainingNotificationIds,
  })
})
