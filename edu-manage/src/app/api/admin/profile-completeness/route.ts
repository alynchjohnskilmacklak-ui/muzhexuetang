import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireRole } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  await requireRole(['admin'])
  const prisma = await getRequestPrisma()

  const monthsParam = Number(req.nextUrl.searchParams.get('months'))
  const months = Number.isFinite(monthsParam) ? Math.min(24, Math.max(1, Math.round(monthsParam))) : 1
  const to = new Date()
  const from = new Date(to)
  from.setMonth(from.getMonth() - months)

  const [students, gradeRecords, feedbacks, summaries] = await Promise.all([
    prisma.student.findMany({
      where: { status: { not: 'INACTIVE' } },
      select: {
        id: true,
        name: true,
        grade: true,
        mainTeacher: { select: { name: true } },
      },
      orderBy: [{ grade: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.gradeRecord.findMany({
      where: { assessment: { assessDate: { gte: from, lte: to } } },
      select: { studentId: true },
      distinct: ['studentId'],
    }),
    prisma.classroomFeedback.findMany({
      where: { status: 'PUBLISHED', createdAt: { gte: from, lte: to } },
      select: { studentIds: true },
    }),
    prisma.stageSummary.findMany({
      where: { status: 'PUBLISHED', periodEnd: { gte: from, lte: to } },
      select: { studentId: true },
      distinct: ['studentId'],
    }),
  ])

  const gradeStudentIds = new Set(gradeRecords.map((item) => item.studentId))
  const feedbackStudentIds = new Set(feedbacks.flatMap((item) => item.studentIds))
  const summaryStudentIds = new Set(summaries.map((item) => item.studentId))

  const items = students
    .map((student) => {
      const hasGrade = gradeStudentIds.has(student.id)
      const hasFeedback = feedbackStudentIds.has(student.id)
      const hasSummary = summaryStudentIds.has(student.id)
      const missingCount = [hasGrade, hasFeedback, hasSummary].filter((flag) => !flag).length
      return {
        studentId: student.id,
        name: student.name,
        grade: student.grade,
        mainTeacherName: student.mainTeacher?.name || null,
        hasGrade,
        hasFeedback,
        hasSummary,
        missingCount,
      }
    })
    .sort((a, b) => b.missingCount - a.missingCount || a.name.localeCompare(b.name, 'zh-Hans-CN'))

  return NextResponse.json({
    range: { from, to, months },
    summary: {
      noGrade: items.filter((item) => !item.hasGrade).length,
      noFeedback: items.filter((item) => !item.hasFeedback).length,
      noSummary: items.filter((item) => !item.hasSummary).length,
    },
    items,
  })
})
