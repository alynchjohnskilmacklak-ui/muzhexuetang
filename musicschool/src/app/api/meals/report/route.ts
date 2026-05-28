import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mealCounts, parseMealDetails, startOfLocalDay } from '@/lib/meals'
import { requireCurrentTeacher } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || !['admin', 'teacher'].includes(role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const reportDate = startOfLocalDay(request.nextUrl.searchParams.get('date') || new Date())
  if (!reportDate) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  const nextDate = new Date(reportDate.getTime() + 86400000)

  let teacherId: string | undefined
  if (role === 'teacher') {
    const current = await requireCurrentTeacher()
    teacherId = current.teacher.id
  }

  const reports = await prisma.mealReport.findMany({
    where: { reportDate: { gte: reportDate, lt: nextDate }, ...(teacherId ? { teacherId } : {}) },
    include: { teacher: { select: { id: true, name: true } }, menu: true },
    orderBy: { submittedAt: 'desc' },
  })
  return NextResponse.json({ reports })
}

export async function POST(request: NextRequest) {
  try {
    const { teacher } = await requireCurrentTeacher()
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
      },
      include: { menu: true, teacher: { select: { id: true, name: true } } },
    })
    return NextResponse.json(report, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}
