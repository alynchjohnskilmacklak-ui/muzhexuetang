import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { visibleNotificationWhere } from '@/lib/business-visibility'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const notification = await prisma.notification.findFirst({
    where: { id, userId, ...visibleNotificationWhere },
  })
  if (!notification) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date(), read: true },
  })
  return NextResponse.json({ success: true })
}
