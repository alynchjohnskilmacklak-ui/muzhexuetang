import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() || null : null
}

async function requireAdmin() {
  const session = await auth()
  return session?.user && (session.user as { role?: string }).role === 'admin' ? session : null
}

export const GET = apiHandler(async () => {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const templates = await prisma.mealTemplate.findMany({
    where: { isActive: true, weekday: { gte: 1, lte: 6 } },
    orderBy: { weekday: 'asc' },
  })
  return NextResponse.json({ templates })
})

export const POST = apiHandler(async (req: NextRequest) => {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const body = await req.json()
  const weekday = Number(body.weekday)
  if (weekday < 1 || weekday > 6) {
    return NextResponse.json({ error: 'Invalid weekday' }, { status: 400 })
  }

  const existing = await prisma.mealTemplate.findFirst({ where: { weekday, isActive: true } })
  const data = {
    title: clean(body.title),
    breakfast: clean(body.breakfast),
    lunch: clean(body.lunch),
    dinner: clean(body.dinner),
    snack: clean(body.snack),
    note: clean(body.note),
  }
  const template = existing
    ? await prisma.mealTemplate.update({ where: { id: existing.id }, data })
    : await prisma.mealTemplate.create({ data: { weekday, ...data } })

  return NextResponse.json({ success: true, template })
})
