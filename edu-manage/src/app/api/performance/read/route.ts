import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { parentVisiblePerformancePostWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { markLinkedContentNotificationsRead } from '@/lib/notification-read-state'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const userId = user.id

  const body = await req.json().catch(() => ({}))
  const rawPostIds: unknown[] = Array.isArray(body.postIds) ? body.postIds : []
  const postIds: string[] = Array.from(new Set<string>(
    rawPostIds.filter((id): id is string => typeof id === 'string' && id.length > 0),
  )).slice(0, 50)
  if (!postIds.length) {
    return NextResponse.json({ updated: 0 }, { headers: { 'Cache-Control': 'private, no-store' } })
  }

  const prisma = await getRequestPrisma()
  const readAt = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    const visiblePosts = await tx.performancePost.findMany({
      where: { id: { in: postIds }, ...parentVisiblePerformancePostWhere(userId) },
      select: { id: true },
    })
    const visiblePostIds = visiblePosts.map((post) => post.id)
    if (!visiblePostIds.length) return 0

    const result = await tx.performancePost.updateMany({
      where: {
        id: { in: visiblePostIds },
        isReadByParent: false,
        ...parentVisiblePerformancePostWhere(userId),
      },
      data: { isReadByParent: true },
    })
    await Promise.all(visiblePostIds.map((relatedId) => markLinkedContentNotificationsRead(tx.notification, {
      userId,
      relatedId,
      relatedTypes: ['PERFORMANCE_FEEDBACK', 'PERFORMANCE_UPDATE'],
      legacyHrefContains: `feedbackId=${encodeURIComponent(relatedId)}`,
      readAt,
    })))
    return result.count
  })

  return NextResponse.json({ updated }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
})
