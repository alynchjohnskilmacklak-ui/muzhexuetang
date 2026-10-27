import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 通知自动归档：将超过 30 天仍未读的通知 status ACTIVE → ARCHIVED。
// ARCHIVED 自动退出角标/未读计数（visibleNotificationWhere 要求 status=ACTIVE），
// 数据保留不删除，列表页可通过 /parent/notifications?archived=1 查阅历史。
const ARCHIVE_AFTER_DAYS = 30

export const GET = apiHandler(async (req: NextRequest) => {
  const token = new URL(req.url).searchParams.get('token')
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) return NextResponse.json({ error: '无权限' }, { status: 401 })

  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000)
  const run = async (db: typeof prisma) =>
    db.notification.updateMany({
      where: { status: 'ACTIVE', read: false, createdAt: { lt: cutoff } },
      data: { status: 'ARCHIVED' },
    })

  const results = isDualDbEnabled()
    ? {
        JUNIOR: await run(getPrismaForDivision('JUNIOR')),
        SENIOR: await run(getPrismaForDivision('SENIOR')),
      }
    : { DEFAULT: await run(prisma) }

  return NextResponse.json({ success: true, cutoff: cutoff.toISOString(), archivedAfterDays: ARCHIVE_AFTER_DAYS, results })
})
