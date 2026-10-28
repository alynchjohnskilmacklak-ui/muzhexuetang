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
  const config = await prisma.roleConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })
  return NextResponse.json(config)
})

export const PATCH = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
 
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  return NextResponse.json({ error: '此配置尚未接入业务执行，暂不允许修改；当前规则由服务端权限和业务事件控制' }, { status: 409 })
})
