import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { visibleNotificationWhere } from '@/lib/business-visibility'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const { id, all } = await req.json()

  if (all) {
    await prisma.notification.updateMany({
      where: { userId, read: false, ...visibleNotificationWhere },
      data: { read: true },
    })
  } else if (id) {
    await prisma.notification.updateMany({
      where: { id, userId, ...visibleNotificationWhere },
      data: { read: true },
    })
  }

  return NextResponse.json({ success: true })
}
