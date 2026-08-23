import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { mealCounts, parseMealDetails, startOfLocalDay } from '@/lib/meals'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || !['admin', 'teacher'].includes(role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  let prisma = await getRequestPrisma()

  const reportDate = startOfLocalDay(request.nextUrl.searchParams.get('date') || new Date())
  if (!reportDate) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  const nextDate = new Date(reportDate.getTime() + 86400000)
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, request.nextUrl.searchParams.get('division'))
  const divisionFilter = { division }

  let teacherId: string | undefined
  if (role === 'teacher') {
    const current = await requireCurrentTeacher()
    prisma = current.prisma
    teacherId = current.teacher.id
  }

  const [legacyReports, attendanceMeals] = await Promise.all([
    prisma.mealReport.findMany({
      where: { reportDate: { gte: reportDate, lt: nextDate }, ...(teacherId ? { teacherId } : {}), ...divisionFilter },
      include: { teacher: { select: { id: true, name: true } }, menu: true },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.studentMealAttendance.findMany({
      where: {
        mealDate: { gte: reportDate, lt: nextDate },
        division,
        ...(teacherId
          ? { teacherId }
          : {
              OR: [
                { teacherId: { not: null } },
                { source: 'AUTO' },
                { lessonId: { not: null } },
              ],
            }),
      },
      include: {
        student: { select: { id: true, name: true } },
        recorder: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const groupedAttendance = new Map<string, typeof attendanceMeals>()
  for (const record of attendanceMeals) {
    const key = record.lessonId || record.groupId || `${record.teacherId}:${record.groupName || '未标注班级'}`
    groupedAttendance.set(key, [...(groupedAttendance.get(key) || []), record])
  }

  const attendanceReports = [...groupedAttendance.entries()].map(([key, records]) => {
    const first = records[0]
    const details = records
      .filter((record) => record.eating)
      .map((record) => ({
        studentId: record.student.id,
        studentName: record.student.name,
        portion: 'single' as const,
        groupName: record.groupName || '未标注班级',
      }))
    const submittedAt = records.reduce(
      (latest, record) => record.updatedAt > latest ? record.updatedAt : latest,
      first.updatedAt,
    )
    return {
      id: `attendance:${key}`,
      teacherId: first.teacherId,
      reportDate,
      submittedAt,
      totalCount: details.length,
      riceSingle: details.length,
      riceDouble: 0,
      noodleCount: 0,
      notes: '首节课考勤同步上报',
      details,
      division,
      menuId: null,
      menu: null,
      teacher: {
        id: first.teacherId || first.recorder.id,
        name: first.teacherName || first.recorder.name || '教师',
      },
    }
  })

  const reports = [
    ...attendanceReports,
    ...legacyReports.map((report) => ({
      ...report,
      details: parseMealDetails(report.details).map((detail) => ({
        ...detail,
        groupName: detail.groupName || `${report.teacher.name}上报`,
      })),
    })),
  ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

  return NextResponse.json({ reports, refreshedAt: new Date().toISOString() }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
})

export async function POST(request: NextRequest) {
  try {
    const { teacher, prisma } = await requireCurrentTeacher()
    const body = await request.json()
    const reportDate = startOfLocalDay(body.reportDate || new Date())
    const details = parseMealDetails(body.details)
    const menuId = typeof body.menuId === 'string' ? body.menuId : ''
    if (!reportDate || !menuId) return NextResponse.json({ error: 'Invalid report data' }, { status: 400 })

    const menu = await prisma.mealMenu.findUnique({ where: { id: menuId } })
    if (!menu) return NextResponse.json({ error: 'Menu not found' }, { status: 404 })
    const counts = mealCounts(details, menu.mainDish)
    const report = await prisma.mealReport.upsert({
      where: { menuId_teacherId_reportDate: { menuId, teacherId: teacher.id, reportDate } },
      update: {
        ...counts,
        details,
        notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      },
      create: {
        menuId,
        teacherId: teacher.id,
        reportDate,
        ...counts,
        details,
        notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
        division: teacher.division || 'JUNIOR',
      },
      include: { menu: true, teacher: { select: { id: true, name: true } } },
    })
    return NextResponse.json(report, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}
