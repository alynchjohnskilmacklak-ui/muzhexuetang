import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const message = await prisma.parentMessage.findUnique({ where: { id } })
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (message.status === 'CLOSED') return NextResponse.json({ error: '该留言已关闭' }, { status: 400 })

  if (user.role === 'parent' && message.parentId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (user.role === 'teacher' && message.teacherId && message.teacherId !== user.teacherId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!content) return NextResponse.json({ error: '回复内容不能为空' }, { status: 400 })
  if (content.length > 2000) return NextResponse.json({ error: '回复内容不能超过2000字' }, { status: 400 })

  const isParent = user.role === 'parent'

  const reply = await prisma.parentMessageReply.create({
    data: {
      messageId: id,
      authorId: user.id,
      authorName: user.name || user.role,
      role: user.role,
      content,
      isReadByParent: !isParent,
      isReadByTeacher: isParent ? false : true,
    },
  })

  await prisma.parentMessage.update({
    where: { id },
    data: { updatedAt: new Date() },
  })

  return NextResponse.json(reply, { status: 201 })
})
