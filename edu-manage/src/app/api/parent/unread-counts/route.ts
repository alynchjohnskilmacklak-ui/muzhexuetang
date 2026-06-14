import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { parentActiveStudentWhere, parentVisibleExamPaperWhere, parentVisiblePerformancePostWhere, visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }


  const prisma = await getRequestPrisma()
  const [papers, posts, notifications] = await Promise.all([
    prisma.examPaper.count({
      where: {
        ...parentVisibleExamPaperWhere(user.id),
        isReadByParent: false,
      },
    }),
    prisma.performancePost.count({
      where: {
        ...parentVisiblePerformancePostWhere(user.id),
        isReadByParent: false,
        visibility: 'PARENT_ONLY',
      },
    }),
    prisma.notification.count({
      where: { userId: user.id, read: false, ...visibleNotificationWhere, user: { students: { some: parentActiveStudentWhere(user.id) } } },
    }),
  ])

  return NextResponse.json({ papers, posts, notifications }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
  })
})
