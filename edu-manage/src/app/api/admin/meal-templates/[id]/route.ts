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

export const PUT = apiHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await context.params
  const body = await req.json()
  const weekday = Number(body.weekday)
  if (weekday < 1 || weekday > 6) {
    return NextResponse.json({ error: 'Invalid weekday' }, { status: 400 })
  }

  const template = await prisma.mealTemplate.update({
    where: { id },
    data: {
      weekday,
      title: clean(body.title),
      breakfast: clean(body.breakfast),
      lunch: clean(body.lunch),
      dinner: clean(body.dinner),
      snack: clean(body.snack),
      note: clean(body.note),
      isActive: true,
    },
  })
  return NextResponse.json({ success: true, template })
})

export const DELETE = apiHandler(async (_req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await context.params
  await prisma.mealTemplate.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
})
