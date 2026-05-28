import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

async function requireAdmin() {
  const session = await auth()
  return session?.user && (session.user as { role?: string }).role === 'admin' ? session : null
}

export const PUT = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await context.params
  const body = await request.json()
  const mainDish = typeof body.mainDish === 'string' ? body.mainDish.trim() : ''
  if (!mainDish) return NextResponse.json({ error: 'mainDish required' }, { status: 400 })

  const menu = await prisma.mealMenu.update({
    where: { id },
    data: {
      mainDish,
      sideDish: typeof body.sideDish === 'string' ? body.sideDish.trim() || null : null,
      allowDouble: !!body.allowDouble,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    },
  })
  return NextResponse.json(menu)
})

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await context.params
  await prisma.mealMenu.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
