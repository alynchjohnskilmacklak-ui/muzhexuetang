import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { teacherCanAccessParentMessage } from '@/lib/parent-message-access'
import {
  notifyParentAboutMessageReply,
  notifyTeacherAboutParentMessage,
} from '@/lib/parent-message-notifications'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['parent', 'teacher', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()
  const { id } = await params

  const message = await prisma.parentMessage.findUnique({ where: { id } })
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (message.status === 'CLOSED') return NextResponse.json({ error: '该留言已关闭' }, { status: 400 })

  if (user.role === 'parent' && message.parentId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (user.role === 'teacher') {
    if (!user.teacherId || !await teacherCanAccessParentMessage(prisma, message, user.teacherId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!content) return NextResponse.json({ error: '回复内容不能为空' }, { status: 400 })
  if (content.length > 2000) return NextResponse.json({ error: '回复内容不能超过2000字' }, { status: 400 })

  const isParent = user.role === 'parent'

  const reply = await prisma.$transaction(async (tx) => {
    if (user.role === 'teacher' && user.teacherId && !message.teacherId) {
      await tx.parentMessage.update({ where: { id }, data: { teacherId: user.teacherId } })
    }

    const created = await tx.parentMessageReply.create({
      data: {
        messageId: id,
        authorId: user.id,
        authorName: user.name || user.role,
        role: user.role,
        content,
        isReadByParent: isParent,
        isReadByTeacher: !isParent,
      },
    })

    const nextStatus = isParent
      ? 'OPEN'
      : user.role === 'teacher'
        ? 'REPLIED'
        : message.status

    await tx.parentMessage.update({
      where: { id },
      data: { updatedAt: new Date(), status: nextStatus },
    })

    const targetTeacherId = message.teacherId || (
      user.role === 'teacher' ? user.teacherId : null
    )
    if (isParent && targetTeacherId) {
      await notifyTeacherAboutParentMessage(tx, {
        teacherId: targetTeacherId,
        messageId: message.id,
        parentName: user.name || '家长',
        studentId: message.studentId,
        studentName: null,
        senderId: user.id,
      })
    } else if (!isParent && (user.role === 'teacher' || user.role === 'admin')) {
      await notifyParentAboutMessageReply(tx, {
        parentId: message.parentId,
        messageId: message.id,
        replierName: user.name || (user.role === 'admin' ? '管理员' : '老师'),
        replierRole: user.role,
        studentId: message.studentId,
        senderId: user.id,
      })
    }

    return created
  })

  return NextResponse.json(reply, { status: 201 })
})
