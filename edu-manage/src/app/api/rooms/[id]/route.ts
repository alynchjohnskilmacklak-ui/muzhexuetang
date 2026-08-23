import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const { id } = await params
  const prisma = await getRequestPrisma()
  try {
    const body = await req.json()
    const room = await prisma.room.update({ where: { id }, data: { name: body.name, capacity: parseInt(body.capacity), type: body.type, usageType: body.usageType || 'GENERAL' } })
    return NextResponse.json(room)
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ error: '教室名称已存在' }, { status: 409 })
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()
  const { id } = await params
  const count = await prisma.schedule.count({ where: { roomId: id, status: 'scheduled' } })
  if (count > 0) {
    return NextResponse.json({ error: `该教室有 ${count} 条未完成排课，请先调整排课后再删除` }, { status: 409 })
  }
  // 同时检查新排课系统（ClassGroup）对教室的引用，避免删除仍被班级课占用的教室。
  const classGroupCount = await prisma.classGroup.count({ where: { roomId: id, status: { not: 'ARCHIVED' } } })
  if (classGroupCount > 0) {
    return NextResponse.json({ error: `该教室有 ${classGroupCount} 个班级排课引用，请先调整排课后再删除` }, { status: 409 })
  }
  await prisma.room.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
