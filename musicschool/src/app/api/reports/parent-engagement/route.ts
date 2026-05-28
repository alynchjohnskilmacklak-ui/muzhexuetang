import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalPosts,
    totalPapers,
    totalReactions,
    totalComments,
    paperReadCount,
    publishedPapers,
  ] = await Promise.all([
    prisma.performancePost.count({ where: { deletedAt: null } }),
    prisma.examPaper.count({ where: { status: 'PUBLISHED' } }),
    prisma.paperReaction.count(),
    prisma.paperComment.count(),
    prisma.examPaper.count({ where: { status: 'PUBLISHED', isReadByParent: true } }),
    prisma.examPaper.count({ where: { status: 'PUBLISHED' } }),
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
}
