import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMealWeek, templateToMenuLike, type EffectiveMealMenu } from '@/lib/meals'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekStart = startOfMealWeek(request.nextUrl.searchParams.get('weekStart') || new Date())
  if (!weekStart) return NextResponse.json({ error: 'Invalid weekStart' }, { status: 400 })

  const [menus, templates] = await Promise.all([
    prisma.mealMenu.findMany({
      where: { weekStart, mealType: 'lunch', dayOfWeek: { gte: 1, lte: 6 } },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.mealTemplate.findMany({
      where: { isActive: true, weekday: { gte: 1, lte: 6 } },
      orderBy: { weekday: 'asc' },
    }),
  ])
  const menuMap = new Map<number, EffectiveMealMenu>(menus.map((menu) => [menu.dayOfWeek, {
    id: menu.id,
    dayOfWeek: menu.dayOfWeek,
    mainDish: menu.mainDish,
    sideDish: menu.sideDish,
    allowDouble: menu.allowDouble,
    notes: menu.notes,
    source: 'date',
  }]))
  for (const template of templates) {
    if (!menuMap.has(template.weekday)) {
      menuMap.set(template.weekday, templateToMenuLike(template))
    }
  }
  return NextResponse.json({
    weekStart: weekStart.toISOString(),
    menus: [...menuMap.values()].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const weekStart = startOfMealWeek(body.weekStart || new Date())
  const dayOfWeek = Number(body.dayOfWeek)
  const mainDish = typeof body.mainDish === 'string' ? body.mainDish.trim() : ''
  if (!weekStart || dayOfWeek < 1 || dayOfWeek > 6 || !mainDish) {
    return NextResponse.json({ error: 'Invalid menu data' }, { status: 400 })
  }

  const menu = await prisma.mealMenu.upsert({
    where: { weekStart_dayOfWeek_mealType: { weekStart, dayOfWeek, mealType: 'lunch' } },
    update: {
      mainDish,
      sideDish: typeof body.sideDish === 'string' ? body.sideDish.trim() || null : null,
      allowDouble: !!body.allowDouble,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    },
    create: {
      weekStart,
      dayOfWeek,
      mealType: 'lunch',
      mainDish,
      sideDish: typeof body.sideDish === 'string' ? body.sideDish.trim() || null : null,
      allowDouble: !!body.allowDouble,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      createdBy: (session.user as { id: string }).id,
    },
  })
  return NextResponse.json(menu, { status: 201 })
}
