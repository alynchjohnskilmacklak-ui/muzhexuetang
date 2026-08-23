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
    totalPapers,
    publishedPapers,
    totalQuestions,
    masteredQuestions,
    needsPractice,
    parentReadCount,
    subjectBreakdown,
    weakTopics,
  ] = await Promise.all([
    prisma.examPaper.count({ where: { termId, status: { not: 'DELETED' } } }),
    prisma.examPaper.count({ where: { termId, status: 'PUBLISHED' } }),
    prisma.paperQuestion.count({ where: { paper: { termId } } }),
    prisma.paperQuestion.count({ where: { mastery: 'MASTERED', paper: { termId } } }),
    prisma.paperQuestion.count({ where: { mastery: 'NEEDS_PRACTICE', paper: { termId } } }),
    prisma.examPaper.count({ where: { termId, status: 'PUBLISHED', isReadByParent: true } }),
    prisma.examPaper.groupBy({ by: ['subject'], where: { termId, status: 'PUBLISHED' }, _count: { id: true } }),
    prisma.weaknessRecord.groupBy({
      by: ['topic'],
      where: { paper: { termId } },
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
})
