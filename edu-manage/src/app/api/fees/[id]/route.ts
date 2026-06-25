import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const db = await getRequestPrisma()
  const { id } = await params
  const body = await req.json()

  const existing = await db.fee.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

  const { amount, type, hours, campus, operator, notes, paidAt, courseId, studentId } = body

  const data: Record<string, unknown> = {}
  if (typeof amount === 'number') data.amount = amount
  if (typeof type === 'string') data.type = type
  if (hours !== undefined) data.hours = hours
  if (campus !== undefined) data.campus = campus
  if (operator !== undefined) data.operator = operator
  if (notes !== undefined) data.notes = notes
  if (paidAt !== undefined) data.paidAt = paidAt ? new Date(paidAt) : null
  if (courseId !== undefined) data.courseId = courseId
  if (studentId !== undefined) data.studentId = studentId

  const updated = await db.fee.update({ where: { id }, data })

  const userId = (session.user as { id: string }).id
  await db.activityLog.create({
    data: { userId, action: '编辑收费记录', detail: `${existing.studentId} ¥${existing.amount} → ¥${amount ?? existing.amount}` },
  })

  revalidatePath('/fees')
  return NextResponse.json(updated)
})

export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const db = await getRequestPrisma()
  const { id } = await params

  const existing = await db.fee.findUnique({ where: { id }, include: { student: { select: { name: true } } } })
  if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

  await db.fee.delete({ where: { id } })

  const userId = (session.user as { id: string }).id
  await db.activityLog.create({
    data: { userId, action: '删除收费记录', detail: `${existing.student?.name || existing.studentId} ¥${existing.amount}` },
  })

  revalidatePath('/fees')
  return NextResponse.json({ success: true })
})
