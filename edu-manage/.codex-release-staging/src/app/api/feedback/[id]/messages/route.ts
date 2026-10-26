import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { createParentFeedbackMessage } from '@/lib/feedback-conversation'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const prisma = await getRequestPrisma()
  const conversation = await prisma.parentMessage.findFirst({
    where: { feedbackId: id, parentId: user.id },
    include: {
      parent: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      replies: { orderBy: { createdAt: 'asc' } },
    },
  })
  return NextResponse.json({ conversation })
})

export const POST = apiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as { content?: unknown }
  const content = typeof body.content === 'string' ? body.content : ''
  const prisma = await getRequestPrisma()

  try {
    const conversation = await createParentFeedbackMessage({
      prisma,
      feedbackId: id,
      parentId: user.id,
      parentName: user.name || '家长',
      content,
    })
    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'MESSAGE_CONTENT_REQUIRED') {
      return NextResponse.json({ error: '留言内容不能为空' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'FEEDBACK_NOT_FOUND') {
      return NextResponse.json({ error: '课堂反馈不存在' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'FEEDBACK_PARENT_FORBIDDEN') {
      return NextResponse.json({ error: '无权留言此课堂反馈' }, { status: 403 })
    }
    throw error
  }
})
