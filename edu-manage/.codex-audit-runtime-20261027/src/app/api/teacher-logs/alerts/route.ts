import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '未授权' }, { status: 403 })


  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user, request.nextUrl.searchParams.get('division'))
  const alerts = await prisma.teacherAlert.findMany({
    where: { isResolved: false, teacher: { division } },
    include: { teacher: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(alerts)
})

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '未授权' }, { status: 403 })


  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user, request.nextUrl.searchParams.get('division'))
  const body = await request.json()
  const { alertId } = body

  if (typeof alertId !== 'string' || !alertId) return NextResponse.json({ error: '缺少预警ID' }, { status: 400 })
  const alert = await prisma.teacherAlert.findFirst({ where: { id: alertId, teacher: { division } }, select: { id: true } })
  if (!alert) return NextResponse.json({ error: '预警不存在' }, { status: 404 })

  await prisma.teacherAlert.update({
    where: { id: alertId },
    data: { isResolved: true, resolvedAt: new Date() },
  })
  return NextResponse.json({ success: true })
})
