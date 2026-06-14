import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const sp = request.nextUrl.searchParams
  const page = parseInt(sp.get('page') || '1')
  const pageSize = parseInt(sp.get('pageSize') || '50')
  const search = sp.get('search') || ''
  const userId = sp.get('userId') || ''

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { detail: { contains: search } },
      { action: { contains: search } },
    ]
  }
  if (userId) where.userId = userId

  const [data, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activityLog.count({ where }),
  ])

  return NextResponse.json({
    data: data.map((log) => ({
      id: log.id,
      user: log.user?.name ?? '系统',
      role: log.user?.role ?? '',
      action: log.action,
      detail: log.detail || '',
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  })
})
