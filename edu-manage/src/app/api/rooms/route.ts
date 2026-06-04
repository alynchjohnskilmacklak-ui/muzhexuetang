import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rooms = await prisma.room.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } })
  return NextResponse.json(rooms)
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  try {
    const { name, capacity, type, usageType } = await req.json()
    if (!name) return NextResponse.json({ error: '教室名称不能为空' }, { status: 400 })
    const room = await prisma.room.create({ data: { name, capacity: parseInt(capacity) || 30, type: type || '普通教室', usageType: usageType || 'GENERAL' } })
    return NextResponse.json(room, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ error: '教室名称已存在' }, { status: 409 })
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
