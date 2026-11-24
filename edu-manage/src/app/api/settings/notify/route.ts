import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
 
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()
  const config = await prisma.notifyConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })
  return NextResponse.json(config)
})

export const PATCH = apiHandler(async (request: Request) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
 
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: '通知设置格式无效' }, { status: 400 })
  }

  const data: { absenceAlert?: boolean; lowHoursWarn?: number; overdueFeeAlert?: boolean } = {}
  if (Object.hasOwn(body, 'absenceAlert')) {
    if (typeof body.absenceAlert !== 'boolean') {
      return NextResponse.json({ error: '旷课提醒必须是开关值' }, { status: 400 })
    }
    data.absenceAlert = body.absenceAlert
  }
  if (Object.hasOwn(body, 'lowHoursWarn')) {
    if (typeof body.lowHoursWarn !== 'number' || !Number.isInteger(body.lowHoursWarn) || body.lowHoursWarn < 0 || body.lowHoursWarn > 50) {
      return NextResponse.json({ error: '低课时阈值须为 0 至 50 的整数；0 表示关闭提醒' }, { status: 400 })
    }
    data.lowHoursWarn = body.lowHoursWarn
  }
  if (Object.hasOwn(body, 'overdueFeeAlert')) {
    if (typeof body.overdueFeeAlert !== 'boolean') {
      return NextResponse.json({ error: '欠费提醒必须是开关值' }, { status: 400 })
    }
    data.overdueFeeAlert = body.overdueFeeAlert
  }
  if (Object.keys(data).length === 0 || Object.keys(body).some((key) => !['absenceAlert', 'lowHoursWarn', 'overdueFeeAlert'].includes(key))) {
    return NextResponse.json({ error: '没有可保存的通知设置' }, { status: 400 })
  }

  const prisma = await getRequestPrisma()
  const config = await prisma.notifyConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...data },
    update: data,
  })
  return NextResponse.json(config)
})
