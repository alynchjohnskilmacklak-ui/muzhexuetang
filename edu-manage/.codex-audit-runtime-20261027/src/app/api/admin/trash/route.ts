import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { cleanupExpiredTrash, TRASH_RETENTION_DAYS } from '@/lib/data-correction/trash'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const where = type && type !== 'all' ? { entityType: type } : {}
  const records = await prisma.deletedRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 })
  const userIds = [...new Set(records.map((item) => item.deletedById).filter((id): id is string => Boolean(id)))]
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : []
  const termIds = [...new Set(records.map((item) => item.termId).filter((id): id is string => Boolean(id)))]
  const terms = termIds.length ? await prisma.academicTerm.findMany({ where: { id: { in: termIds } }, select: { id: true, name: true } }) : []
  const names = new Map(users.map((item) => [item.id, item.name]))
  const termNames = new Map(terms.map((item) => [item.id, item.name]))
  const now = Date.now()
  return NextResponse.json({
    success: true,
    retentionDays: TRASH_RETENTION_DAYS,
    data: records.map((item) => ({
      ...item,
      deletedByName: item.deletedById ? names.get(item.deletedById) || '管理员' : '系统清理',
      termName: item.termId ? termNames.get(item.termId) || '历史批次' : '全局数据',
      daysRemaining: item.expiresAt ? Math.max(0, Math.ceil((item.expiresAt.getTime() - now) / 86_400_000)) : TRASH_RETENTION_DAYS,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  if (body.action !== 'cleanup-expired') return NextResponse.json({ error: '不支持的操作' }, { status: 400 })
  const prisma = await getRequestPrisma()
  const result = await cleanupExpiredTrash(prisma, user.id)
  return NextResponse.json({ success: true, result })
})
