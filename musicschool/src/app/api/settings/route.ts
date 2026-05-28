import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'

export const dynamic = 'force-dynamic'

// GET /api/settings — 获取机构信息
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  let config = await prisma.systemConfig.findUnique({ where: { id: 'singleton' } })
  if (!config) {
    config = await prisma.systemConfig.create({ data: { id: 'singleton' } })
  }
  return NextResponse.json(config)
}

// PATCH /api/settings — 更新机构信息
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const config = await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...body },
    update: body,
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '更新了机构信息', detail: '修改了系统配置' },
  })

  return NextResponse.json(config)
}
