import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMealWeek, templateToMenuLike, type EffectiveMealMenu } from '@/lib/meals'
import { redirect } from 'next/navigation'
import { ParentMealsClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentMealsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const weekStart = startOfMealWeek(new Date())!
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

  return <ParentMealsClient weekStart={weekStart.toISOString()} menus={JSON.parse(JSON.stringify([...menuMap.values()].sort((a, b) => a.dayOfWeek - b.dayOfWeek)))} />
}
