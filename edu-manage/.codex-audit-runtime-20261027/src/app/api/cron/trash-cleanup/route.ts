import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'
import { cleanupExpiredTrash } from '@/lib/data-correction/trash'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const token = new URL(req.url).searchParams.get('token')
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) return NextResponse.json({ error: '无权限' }, { status: 401 })
  const systemUserId = process.env.TRASH_CLEANUP_USER_ID
  if (!systemUserId) return NextResponse.json({ error: '未配置 TRASH_CLEANUP_USER_ID' }, { status: 500 })
  const results = isDualDbEnabled()
    ? {
        JUNIOR: await cleanupExpiredTrash(getPrismaForDivision('JUNIOR'), systemUserId),
        SENIOR: await cleanupExpiredTrash(getPrismaForDivision('SENIOR'), systemUserId),
      }
    : { DEFAULT: await cleanupExpiredTrash(prisma, systemUserId) }
  return NextResponse.json({ success: true, results })
})
