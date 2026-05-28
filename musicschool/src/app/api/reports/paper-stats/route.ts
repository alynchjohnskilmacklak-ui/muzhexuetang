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
    totalPapers,
    publishedPapers,
    totalQuestions,
    masteredQuestions,
    needsPractice,
    parentReadCount,
    subjectBreakdown,
    weakTopics,
  ] = await Promise.all([
    prisma.examPaper.count({ where: { status: { not: 'DELETED' } } }),
    prisma.examPaper.count({ where: { status: 'PUBLISHED' } }),
    prisma.paperQuestion.count(),
    prisma.paperQuestion.count({ where: { mastery: 'MASTERED' } }),
    prisma.paperQuestion.count({ where: { mastery: 'NEEDS_PRACTICE' } }),
    prisma.examPaper.count({ where: { status: 'PUBLISHED', isReadByParent: true } }),
    prisma.examPaper.groupBy({ by: ['subject'], where: { status: 'PUBLISHED' }, _count: { id: true } }),
    prisma.weaknessRecord.groupBy({
      by: ['topic'],
      _count: { topic: true },
      orderBy: { _count: { topic: 'desc' } },
      take: 10,
    }),
  ])

  return NextResponse.json({
    totalPapers,
    masteredRate: totalQuestions > 0 ? Math.round((masteredQuestions / totalQuestions) * 100) : 0,
    needsPracticeCount: needsPractice,
    parentReadRate: publishedPapers > 0 ? Math.round((parentReadCount / publishedPapers) * 100) : 0,
    subjectBreakdown: Object.fromEntries(subjectBreakdown.map((s) => [s.subject, s._count.id])),
    weakTopics: weakTopics.map((w) => ({ topic: w.topic, count: w._count.topic })),
  })
}
