import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { parentVisiblePerformancePostWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const rawPostIds: unknown[] = Array.isArray(body.postIds) ? body.postIds : []
  const postIds: string[] = Array.from(new Set<string>(
    rawPostIds.filter((id): id is string => typeof id === 'string' && id.length > 0),
  )).slice(0, 50)
  if (!postIds.length) {
    return NextResponse.json({ updated: 0 }, { headers: { 'Cache-Control': 'private, no-store' } })
  }

  const prisma = await getRequestPrisma()
  const result = await prisma.performancePost.updateMany({
    where: {
      id: { in: postIds },
      isReadByParent: false,
      ...parentVisiblePerformancePostWhere(user.id),
    },
    data: { isReadByParent: true },
  })

  return NextResponse.json({ updated: result.count }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
})
