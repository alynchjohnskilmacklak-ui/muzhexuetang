import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { teacherCanAccessParentMessage } from '@/lib/parent-message-access'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prisma = await getRequestPrisma()
  const { id } = await params

  const message = await prisma.parentMessage.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      feedback: {
        select: {
          id: true,
          teacherId: true,
          studentIds: true,
          createdAt: true,
          summary: true,
          overallComment: true,
          classLesson: {
            select: {
              lessonDate: true,
              subject: true,
              group: { select: { course: { select: { name: true, subject: true } } } },
            },
          },
        },
      },
      replies: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 授权检查：教师只能读取分配给自己或自己在教学关系内的历史未分配留言。
  if (user.role === 'parent' && message.parentId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (user.role === 'teacher') {
    if (!user.teacherId || !await teacherCanAccessParentMessage(prisma, message, user.teacherId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (user.role === 'parent' && message.parentId === user.id) {
    await prisma.parentMessageReply.updateMany({
      where: { messageId: id, isReadByParent: false },
      data: { isReadByParent: true },
    })
  } else if (user.role === 'teacher') {
    await prisma.parentMessageReply.updateMany({
      where: { messageId: id, isReadByTeacher: false },
      data: { isReadByTeacher: true },
    })
    if (message.status === 'OPEN') {
      await prisma.parentMessage.update({ where: { id }, data: { status: 'READ' } })
    }
  }

  return NextResponse.json(message)
})

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'teacher'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const prisma = await getRequestPrisma()
  const { id } = await params

  const existing = await prisma.parentMessage.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role === 'teacher') {
    if (!user.teacherId || !await teacherCanAccessParentMessage(prisma, existing, user.teacherId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const allowedStatuses = ['OPEN', 'READ', 'REPLIED', 'CLOSED']
  const status = allowedStatuses.includes(body.status) ? body.status : 'OPEN'

  const message = await prisma.parentMessage.update({
    where: { id },
    data: { status },
  })
  return NextResponse.json(message)
})
