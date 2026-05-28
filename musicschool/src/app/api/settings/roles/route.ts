import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const config = await prisma.roleConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })
  return NextResponse.json(config)
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const body = await request.json()
  const config = await prisma.roleConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...body },
    update: body,
  })
  await prisma.activityLog.create({ data: { userId: user.id, action: '更新了角色权限设置' } })
  return NextResponse.json(config)
}
