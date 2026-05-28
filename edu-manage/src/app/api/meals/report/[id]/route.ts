import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mealCounts, parseMealDetails } from '@/lib/meals'
import { requireCurrentTeacher } from '@/lib/teacher-portal'

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { teacher } = await requireCurrentTeacher()
    const { id } = await context.params
    const current = await prisma.mealReport.findFirst({
      where: { id, teacherId: teacher.id },
      include: { menu: true },
    })
    if (!current) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const body = await request.json()
    const details = parseMealDetails(body.details)
    const report = await prisma.mealReport.update({
      where: { id },
      data: {
        ...mealCounts(details, current.menu.mainDish),
        details,
        notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      },
      include: { menu: true, teacher: { select: { id: true, name: true } } },
    })
    return NextResponse.json(report)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}
