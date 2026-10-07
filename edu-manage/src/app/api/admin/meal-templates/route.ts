import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() || null : null
}

async function requireAdmin() {
  const session = await auth()
  return session?.user && (session.user as { role?: string }).role === 'admin' ? session : null
}

export const GET = apiHandler(async (req: NextRequest) => {
 
  const prisma = await getRequestPrisma()
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const division = req.nextUrl.searchParams.get('division') || 'JUNIOR'
  const today = new Date()
  const templates = await prisma.mealTemplate.findMany({
    where: {
      isActive: true,
      weekday: { gte: 1, lte: 6 },
      division,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: today }, endDate: null },
        { startDate: null, endDate: { gte: today } },
        { startDate: { lte: today }, endDate: { gte: today } },
      ],
    },
    orderBy: { weekday: 'asc' },
  })
  const dated = templates.filter((t) => t.startDate || t.endDate)
  const undated = templates.filter((t) => !t.startDate && !t.endDate)
  const datedWeekdays = new Set(dated.map((t) => t.weekday))
  return NextResponse.json({ templates: [...dated, ...undated.filter((t) => !datedWeekdays.has(t.weekday))] })
})

export const POST = apiHandler(async (req: NextRequest) => {
 
  const prisma = await getRequestPrisma()
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const body = await req.json()
  const weekday = Number(body.weekday)
  if (weekday < 1 || weekday > 6) {
    return NextResponse.json({ error: 'Invalid weekday' }, { status: 400 })
  }

  const existing = await prisma.mealTemplate.findFirst({ where: { weekday, isActive: true, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] } })
  const data = {
    title: clean(body.title),
    breakfast: clean(body.breakfast),
    lunch: clean(body.lunch),
    dinner: clean(body.dinner),
    snack: clean(body.snack),
    note: clean(body.note),
    allowDouble: body.allowDouble !== false,
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
  }
  const template = existing
    ? await prisma.mealTemplate.update({ where: { id: existing.id }, data })
    : await prisma.mealTemplate.create({ data: { weekday, ...data } })

  return NextResponse.json({ success: true, template })
})
