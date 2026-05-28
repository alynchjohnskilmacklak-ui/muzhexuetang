import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveMealMenuForDate } from '@/lib/meal-template'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const today = startOfToday()
  const dayOfWeek = today.getDay()

  if (dayOfWeek === 0) {
    return NextResponse.json({ menu: null, students: [], choices: [] })
  }

  const menu = dayOfWeek >= 1 && dayOfWeek <= 6 ? await getEffectiveMealMenuForDate(today) : null

  const students = await prisma.student.findMany({
    where: { parentId: userId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  if (!menu) return NextResponse.json({ menu: null, students, choices: [] })

  const choices = await prisma.parentMealChoice.findMany({
    where: {
      menuId: menu.id,
      choiceDate: today,
      studentId: { in: students.map((student) => student.id) },
    },
  })

  return NextResponse.json({
    menu: {
      id: menu.id,
      mainDish: menu.mainDish,
      sideDish: menu.sideDish,
      allowDouble: menu.allowDouble,
    },
    students,
    choices: choices.map((choice) => ({ studentId: choice.studentId, eating: choice.eating })),
  })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const { studentId, menuId, eating } = await req.json()
  if (!studentId || !menuId || typeof eating !== 'boolean') {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student || student.parentId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const today = startOfToday()
  const choice = await prisma.parentMealChoice.upsert({
    where: {
      studentId_menuId_choiceDate: {
        studentId,
        menuId,
        choiceDate: today,
      },
    },
    update: { eating },
    create: { studentId, menuId, choiceDate: today, eating },
  })

  return NextResponse.json(choice)
})
