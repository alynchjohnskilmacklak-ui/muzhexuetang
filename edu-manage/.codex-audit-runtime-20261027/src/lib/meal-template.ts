import { getRequestPrisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { startOfMealWeek } from '@/lib/meals'

export async function getEffectiveMealMenuForDate(date: Date, prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? await getRequestPrisma()
  const dayOfWeek = date.getDay()
  if (dayOfWeek < 1 || dayOfWeek > 6) return null

  const weekStart = startOfMealWeek(date)
  if (!weekStart) return null

  const existing = await prisma.mealMenu.findFirst({
    where: { weekStart, dayOfWeek, mealType: 'lunch' },
  })
  if (existing) return existing

  const template = await prisma.mealTemplate.findFirst({
    where: {
      weekday: dayOfWeek,
      isActive: true,
      OR: [
        { startDate: null },
        { startDate: { lte: date } },
      ],
      AND: [
        {
          OR: [
            { endDate: null },
            { endDate: { gte: date } },
          ],
        },
      ],
    },
  })
  if (!template || !template.lunch) return null

  const creator = await prisma.user.findFirst({
    where: { role: 'admin', status: 'active' },
    select: { id: true },
  })
  if (!creator) return null

  const sideDish = [
    template.breakfast ? `早餐：${template.breakfast}` : '',
    template.dinner ? `晚餐：${template.dinner}` : '',
    template.snack ? `加餐：${template.snack}` : '',
  ].filter(Boolean).join('；') || null

  return prisma.mealMenu.upsert({
    where: { weekStart_dayOfWeek_mealType: { weekStart, dayOfWeek, mealType: 'lunch' } },
    update: {},
    create: {
      weekStart,
      dayOfWeek,
      mealType: 'lunch',
      mainDish: template.lunch,
      sideDish,
      allowDouble: false,
      notes: template.note,
      createdBy: creator.id,
    },
  })
}
