import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const { id } = await params
  const body = await request.json()
  const ft = await prisma.feeType.update({ where: { id }, data: body })
  return NextResponse.json(ft)
})

export const DELETE = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const { id } = await params
  const ft = await prisma.feeType.findUnique({ where: { id } })
  if (!ft) return NextResponse.json({ error: '费用类型不存在' }, { status: 404 })

  const feeCount = await prisma.fee.count({ where: { type: ft.name } })
  if (feeCount > 0) {
    return NextResponse.json({ error: `该费用类型有 ${feeCount} 条缴费记录关联，无法删除` }, { status: 409 })
  }

  await prisma.feeType.delete({ where: { id } })
  await prisma.activityLog.create({ data: { userId: user.id, action: '删除了费用类型', detail: `删除了「${ft.name}」` } })
  return NextResponse.json({ success: true })
})
