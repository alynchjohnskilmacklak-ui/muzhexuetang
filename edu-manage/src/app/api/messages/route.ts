import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined

  let where: Record<string, unknown> = {}
  if (user.role === 'parent') {
    where = { parentId: user.id }
  } else if (user.role === 'teacher') {
    where = { teacherId: user.teacherId }
  }
  if (status) where.status = status

  const messages = await prisma.parentMessage.findMany({
    where,
    include: {
      parent: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ messages })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const teacherId = typeof body.teacherId === 'string' ? body.teacherId : null
  const studentId = typeof body.studentId === 'string' ? body.studentId : null
  const subject = typeof body.subject === 'string' ? body.subject.trim() : null

  if (!title) return NextResponse.json({ error: '请填写标题' }, { status: 400 })
  if (title.length > 100) return NextResponse.json({ error: '标题不能超过100字' }, { status: 400 })
  if (!content) return NextResponse.json({ error: '请填写问题内容' }, { status: 400 })
  if (content.length > 2000) return NextResponse.json({ error: '内容不能超过2000字' }, { status: 400 })

  const message = await prisma.parentMessage.create({
    data: {
      parentId: user.id,
      studentId,
      teacherId,
      subject,
      title,
      replies: {
        create: {
          authorId: user.id,
          authorName: user.name || '家长',
          role: 'parent',
          content,
          isReadByTeacher: false,
          isReadByParent: true,
        },
      },
    },
    include: {
      parent: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      replies: { orderBy: { createdAt: 'asc' } },
    },
  })

  return NextResponse.json(message, { status: 201 })
})
