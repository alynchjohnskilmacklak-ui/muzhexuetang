import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '未授权' }, { status: 403 })

  const alerts = await prisma.teacherAlert.findMany({
    where: { isResolved: false },
    include: { teacher: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(alerts)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '未授权' }, { status: 403 })

  const body = await request.json()
  const { alertId } = body

  await prisma.teacherAlert.update({
    where: { id: alertId },
    data: { isResolved: true, resolvedAt: new Date() },
  })
  return NextResponse.json({ success: true })
}
