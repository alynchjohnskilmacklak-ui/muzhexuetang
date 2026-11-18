import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { buildDigestContent, localWeekRange } from '@/lib/notification-digest'

export const dynamic = 'force-dynamic'

// 摘要级通知：每周一聚合上周（周一~周日）家长收到的各类通知，
// 为每位家长生成 1 条 WEEKLY_DIGEST 周报（幂等：按 relatedId=weekKey 去重）。
const DIGEST_TYPE = 'WEEKLY_DIGEST'

async function runDigest(db: typeof prisma, now: Date) {
  const { weekKey, start, end } = localWeekRange(now)
  const weeklyActivityWhere = {
    createdAt: { gte: start, lt: end },
    deletedAt: null,
    type: { not: DIGEST_TYPE },
    OR: [{ relatedType: null }, { relatedType: { not: DIGEST_TYPE } }],
  }

  // 仅给家长生成周报，并排除周报自身，避免周报在下一周期被当成新活动。
  const recipients = await db.notification.findMany({
    where: { ...weeklyActivityWhere, user: { is: { role: 'parent' } } },
    select: { userId: true },
    distinct: ['userId'],
  })

  let created = 0
  for (const { userId } of recipients) {
    // Serialize the check-and-create pair across cron invocations and app replicas.
    // Read committed makes the post-lock lookup observe a concurrent transaction's commit.
    // PostgreSQL releases this transaction-scoped lock on commit or rollback.
    const didCreate = await db.$transaction(async (tx) => {
      await tx.$queryRaw`WITH advisory_lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(hashtext('edu-manage.weekly-digest'), hashtext(${userId} || ':' || ${weekKey}))
      ) SELECT 1 AS locked FROM advisory_lock`

      const existing = await tx.notification.findFirst({
        where: { userId, relatedType: DIGEST_TYPE, relatedId: weekKey, deletedAt: null },
        select: { id: true },
      })
      if (existing) return false

      const counts = await tx.notification.groupBy({
        by: ['relatedType'],
        where: { ...weeklyActivityWhere, userId },
        _count: { _all: true },
      })

      const content = buildDigestContent(start, end, counts.map((row) => ({ relatedType: row.relatedType, count: row._count._all })))
      if (!content) return false

      await createNotification(tx, {
        userId,
        type: DIGEST_TYPE,
        relatedType: DIGEST_TYPE,
        relatedId: weekKey,
        title: `上周学习周报（${start.getMonth() + 1}月${start.getDate()}日-${end.getMonth() + 1}月${end.getDate()}日）`,
        content,
        href: '/parent/notifications',
      })
      return true
    }, { isolationLevel: 'ReadCommitted' })
    if (didCreate) created += 1
  }

  return { weekKey, recipients: recipients.length, created }
}

export const GET = apiHandler(async (req: NextRequest) => {
  const token = new URL(req.url).searchParams.get('token')
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) return NextResponse.json({ error: '无权限' }, { status: 401 })

  const now = new Date()
  const results = isDualDbEnabled()
    ? {
        JUNIOR: await runDigest(getPrismaForDivision('JUNIOR'), now),
        SENIOR: await runDigest(getPrismaForDivision('SENIOR'), now),
      }
    : { DEFAULT: await runDigest(prisma, now) }

  return NextResponse.json({ success: true, results })
})
