import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const DELETE = apiHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const consultation = await prisma.volunteerConsultation.findUnique({ where: { id }, select: { parentId: true } })
  if (!consultation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const canDelete = ['admin', 'teacher'].includes(user.role || '') || consultation.parentId === user.id
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.volunteerConsultation.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
