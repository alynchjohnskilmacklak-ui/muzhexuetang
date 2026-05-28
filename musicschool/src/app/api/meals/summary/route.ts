import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfLocalDay } from '@/lib/meals'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const reportDate = startOfLocalDay(request.nextUrl.searchParams.get('date') || new Date())
  if (!reportDate) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  const nextDate = new Date(reportDate.getTime() + 86400000)
  const jsDay = reportDate.getDay()
  const dayOfWeek = jsDay === 0 ? 7 : jsDay
  const weekStart = new Date(reportDate)
  weekStart.setDate(reportDate.getDate() - (dayOfWeek - 1))
  const [reports, activeTeachers, parentChoices, totalStudents] = await Promise.all([
    prisma.mealReport.findMany({
      where: { reportDate: { gte: reportDate, lt: nextDate } },
      include: { teacher: { select: { id: true, name: true } }, menu: true },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.teacher.findMany({
      where: { status: { not: 'RESIGNED' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.parentMealChoice.findMany({
      where: { menu: { weekStart, dayOfWeek }, choiceDate: reportDate },
      include: { student: { select: { name: true, mainTeacherId: true } } },
    }),
    prisma.student.count({ where: { status: { not: 'INACTIVE' } } }),
  ])

  const reportedIds = new Set(reports.map((report) => report.teacherId))
  const parentEating = parentChoices.filter((choice) => choice.eating).length
  const parentNotEating = parentChoices.filter((choice) => !choice.eating).length
  return NextResponse.json({
    totalCount: reports.reduce((sum, report) => sum + report.totalCount, 0),
    singleCount: reports.reduce((sum, report) => sum + report.riceSingle, 0),
    doubleCount: reports.reduce((sum, report) => sum + report.riceDouble, 0),
    reportedTeachers: reports.map((report) => report.teacher),
    unreportedTeachers: activeTeachers.filter((teacher) => !reportedIds.has(teacher.id)),
    details: reports,
    parentStats: {
      eating: parentEating,
      notEating: parentNotEating,
      unselected: Math.max(totalStudents - parentChoices.length, 0),
      detail: parentChoices.map((choice) => ({
        studentName: choice.student.name,
        eating: choice.eating,
      })),
    },
  })
}
