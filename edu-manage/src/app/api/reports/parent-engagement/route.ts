import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getActiveAcademicTerm } from '@/lib/academic-term'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }


  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user, request.nextUrl.searchParams.get('division'))
  const term = user.role === 'admin'
    ? await resolveAdminTermScope(prisma, division, request)
    : await getActiveAcademicTerm(prisma, division)
  const termId = term?.id || '__NO_TERM__'

  const [
    totalPosts,
    totalPapers,
    totalReactions,
    totalComments,
    paperReadCount,
    publishedPapers,
  ] = await Promise.all([
    prisma.performancePost.count({ where: { termId, deletedAt: null } }),
    prisma.examPaper.count({ where: { termId, status: 'PUBLISHED' } }),
    prisma.paperReaction.count({ where: { paper: { termId } } }),
    prisma.paperComment.count({ where: { paper: { termId } } }),
    prisma.examPaper.count({ where: { termId, status: 'PUBLISHED', isReadByParent: true } }),
    prisma.examPaper.count({ where: { termId, status: 'PUBLISHED' } }),
  ])

  const totalPushes = totalPosts + totalPapers
  const readRate = totalPushes > 0 ? Math.round((paperReadCount / publishedPapers) * 100) : 0
  const reactionRate = publishedPapers > 0 ? Math.round((totalReactions / publishedPapers) * 100) : 0

  return NextResponse.json({
    totalPushes,
    readRate,
    reactionRate,
    commentRate: publishedPapers > 0 ? Math.round((totalComments / publishedPapers) * 100) : 0,
    totalReactions,
    totalComments,
  })
})
