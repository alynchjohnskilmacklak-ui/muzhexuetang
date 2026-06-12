import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const message = await prisma.parentMessage.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      replies: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 授权检查：家长只能读自己的留言，教师只能读分配给自己的留言
  if (user.role === 'parent' && message.parentId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (user.role === 'teacher' && message.teacherId !== user.teacherId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (user.role === 'parent' && message.parentId === user.id) {
    await prisma.parentMessageReply.updateMany({
      where: { messageId: id, isReadByParent: false },
      data: { isReadByParent: true },
    })
  } else if ((user.role === 'teacher' && message.teacherId === user.teacherId) || user.role === 'admin') {
    await prisma.parentMessageReply.updateMany({
      where: { messageId: id, isReadByTeacher: false },
      data: { isReadByTeacher: true },
    })
  }

  return NextResponse.json(message)
})

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'teacher'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const existing = await prisma.parentMessage.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role === 'teacher' && existing.teacherId !== user.teacherId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const status = body.status === 'CLOSED' ? 'CLOSED' : 'OPEN'

  const message = await prisma.parentMessage.update({
    where: { id },
    data: { status },
  })
  return NextResponse.json(message)
})
