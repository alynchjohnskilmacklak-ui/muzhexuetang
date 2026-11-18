const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // 本周一 2026-10-12
  const weekStart = new Date('2026-10-12T00:00:00+08:00')
  const menus = await prisma.mealMenu.findMany({
    where: { weekStart },
    orderBy: { dayOfWeek: 'asc' },
    select: { id: true, dayOfWeek: true, mainDish: true, sideDish: true, image: true, description: true },
  })
  console.log('本周MealMenu记录数:', menus.length)
  menus.forEach(m => console.log(JSON.stringify(m)))

  const templates = await prisma.mealTemplate.findMany({
    where: { isActive: true },
    select: { id: true, weekday: true, lunch: true, title: true },
  })
  console.log('启用的MealTemplate数:', templates.length)
  templates.forEach(t => console.log(JSON.stringify(t)))
}

main().finally(() => prisma.$disconnect())
