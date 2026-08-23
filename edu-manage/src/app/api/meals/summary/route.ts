import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { parseMealDetails, startOfLocalDay } from '@/lib/meals'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }


  const prisma = await getRequestPrisma()
  const reportDate = startOfLocalDay(request.nextUrl.searchParams.get('date') || new Date())
  if (!reportDate) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  const nextDate = new Date(reportDate.getTime() + 86400000)
  const jsDay = reportDate.getDay()
  const dayOfWeek = jsDay === 0 ? 7 : jsDay
  const weekStart = new Date(reportDate)
  weekStart.setDate(reportDate.getDate() - (dayOfWeek - 1))
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, request.nextUrl.searchParams.get('division'))
  const divisionFilter = { division }
  const [reports, attendanceMeals, activeTeachers, parentChoices, totalStudents] = await Promise.all([
    prisma.mealReport.findMany({
      where: { reportDate: { gte: reportDate, lt: nextDate }, ...divisionFilter },
      include: { teacher: { select: { id: true, name: true } }, menu: true },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.studentMealAttendance.findMany({
      where: { mealDate: { gte: reportDate, lt: nextDate }, ...divisionFilter },
      select: {
        studentId: true,
        eating: true,
        teacherId: true,
        teacherName: true,
      },
    }),
    prisma.teacher.findMany({
      where: { status: { not: 'RESIGNED' }, ...divisionFilter },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.parentMealChoice.findMany({
      where: { menu: { weekStart, dayOfWeek, ...divisionFilter }, choiceDate: reportDate },
      include: { student: { select: { name: true, mainTeacherId: true } } },
    }),
    prisma.student.count({ where: { status: { not: 'INACTIVE' }, ...divisionFilter } }),
  ])

  const reportedIds = new Set([
    ...reports.map((report) => report.teacherId),
    ...attendanceMeals.flatMap((record) => record.teacherId ? [record.teacherId] : []),
  ])
  const effectiveMeals = new Map<string, 'single' | 'double' | 'none'>()
  for (const record of attendanceMeals) {
    effectiveMeals.set(record.studentId, record.eating ? 'single' : 'none')
  }
  for (const report of reports) {
    for (const detail of parseMealDetails(report.details)) {
      if (!effectiveMeals.has(detail.studentId)) effectiveMeals.set(detail.studentId, detail.portion)
    }
  }
  const effectivePortions = [...effectiveMeals.values()].filter((portion) => portion !== 'none')
  const attendanceTeachers = new Map(
    attendanceMeals.flatMap((record) => record.teacherId
      ? [[record.teacherId, { id: record.teacherId, name: record.teacherName || '教师' }] as const]
      : []),
  )
  const parentEating = parentChoices.filter((choice) => choice.eating).length
  const parentNotEating = parentChoices.filter((choice) => !choice.eating).length
  return NextResponse.json({
    totalCount: effectivePortions.length,
    singleCount: effectivePortions.filter((portion) => portion === 'single').length,
    doubleCount: effectivePortions.filter((portion) => portion === 'double').length,
    reportedTeachers: [
      ...attendanceTeachers.values(),
      ...reports.filter((report) => !attendanceTeachers.has(report.teacherId)).map((report) => report.teacher),
    ],
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
})
