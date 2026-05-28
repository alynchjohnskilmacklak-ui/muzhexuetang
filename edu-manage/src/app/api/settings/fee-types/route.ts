import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const types = await prisma.feeType.findMany({ orderBy: { order: 'asc' } })
  return NextResponse.json(types)
})

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { name, description } = body
  if (!name) return NextResponse.json({ error: '费用名称不能为空' }, { status: 400 })

  const max = await prisma.feeType.aggregate({ _max: { order: true } })
  const ft = await prisma.feeType.create({
    data: { name, description, order: (max._max.order ?? -1) + 1 },
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '新增了费用类型', detail: `添加了「${name}」` },
  })

  return NextResponse.json(ft, { status: 201 })
})
