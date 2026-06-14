import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { startOfMealWeek, templateToMenuLike, type EffectiveMealMenu } from '@/lib/meals'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const weekStart = startOfMealWeek(request.nextUrl.searchParams.get('weekStart') || new Date())
  if (!weekStart) return NextResponse.json({ error: 'Invalid weekStart' }, { status: 400 })
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, request.nextUrl.searchParams.get('division'))
  const divisionFilter = { division }

  const [menus, templates] = await Promise.all([
    prisma.mealMenu.findMany({
      where: { weekStart, mealType: 'lunch', dayOfWeek: { gte: 1, lte: 6 }, ...divisionFilter },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.mealTemplate.findMany({
      where: { isActive: true, weekday: { gte: 1, lte: 6 }, ...divisionFilter },
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
  }, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=120' },
  })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }


  const prisma = await getRequestPrisma()
  const body = await request.json()
  const weekStart = startOfMealWeek(body.weekStart || new Date())
  const dayOfWeek = Number(body.dayOfWeek)
  const mainDish = typeof body.mainDish === 'string' ? body.mainDish.trim() : ''
  if (!weekStart || dayOfWeek < 1 || dayOfWeek > 6 || !mainDish) {
    return NextResponse.json({ error: 'Invalid menu data' }, { status: 400 })
  }

  const menuDivision = (typeof body.division === 'string' ? body.division : 'JUNIOR') as 'JUNIOR' | 'SENIOR'
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
      division: menuDivision,
    },
  })
  return NextResponse.json(menu, { status: 201 })
})
