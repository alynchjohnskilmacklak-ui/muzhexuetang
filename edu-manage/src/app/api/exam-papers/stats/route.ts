import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }


  const prisma = await getRequestPrisma()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const division = getRequestDivision(user, req.nextUrl.searchParams.get('division'))
  const paperStudentWhere = { student: { division } }

  const [
    totalPapers,
    publishedPapers,
    totalQuestions,
    masteredQuestions,
    needsPracticeQuestions,
    parentReadCount,
    subjectBreakdown,
    weakTopics,
  ] = await Promise.all([
    prisma.examPaper.count({ where: { status: { not: 'DELETED' }, ...paperStudentWhere } }),
    prisma.examPaper.count({ where: { status: 'PUBLISHED', ...paperStudentWhere } }),
    prisma.paperQuestion.count({ where: { paper: paperStudentWhere } }),
    prisma.paperQuestion.count({ where: { mastery: 'MASTERED', paper: paperStudentWhere } }),
    prisma.paperQuestion.count({ where: { mastery: 'NEEDS_PRACTICE', paper: paperStudentWhere } }),
    prisma.examPaper.count({ where: { status: 'PUBLISHED', isReadByParent: true, ...paperStudentWhere } }),
    prisma.examPaper.groupBy({
      by: ['subject'],
      where: { status: 'PUBLISHED', ...paperStudentWhere },
      _count: { id: true },
    }),
    prisma.weaknessRecord.groupBy({
      by: ['topic'],
      where: { student: { division } },
      _count: { topic: true },
      orderBy: { _count: { topic: 'desc' } },
      take: 10,
    }),
  ])

  const masteredRate = totalQuestions > 0 ? Math.round((masteredQuestions / totalQuestions) * 100) : 0
  const parentReadRate = publishedPapers > 0 ? Math.round((parentReadCount / publishedPapers) * 100) : 0

  return NextResponse.json({
    totalPapers,
    masteredRate,
    needsPracticeCount: needsPracticeQuestions,
    parentReadRate,
    subjectBreakdown: Object.fromEntries(subjectBreakdown.map((s) => [s.subject, s._count.id])),
    weakTopics: weakTopics.map((w) => ({ topic: w.topic, count: w._count.topic })),
  })
})
