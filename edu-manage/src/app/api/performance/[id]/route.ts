import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { resolveTeacherForUser } from '@/lib/performance'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { markLinkedContentNotificationsRead } from '@/lib/notification-read-state'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  if (!['admin', 'teacher', 'parent'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const teacher = user.role === 'teacher' ? await resolveTeacherForUser(user, prisma) : null
  if (user.role === 'teacher' && !teacher) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const where: Prisma.PerformancePostWhereInput = user.role === 'parent'
    ? {
        id,
        deletedAt: null,
        visibility: { in: ['PARENT_ONLY', 'CLASS_PUBLIC'] as const },
        student: { is: parentLinkedStudentWhere(user.id) },
      }
    : user.role === 'teacher'
      ? { id, deletedAt: null, teacherId: teacher!.id }
      : { id, deletedAt: null }

  const post = await prisma.performancePost.findFirst({
    where,
    include: {
      student: true,
      teacher: true,
      reactions: true,
      comments: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
      badges: true,
    },
  })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role === 'parent') {
    const readAt = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.performancePost.updateMany({
        where: { id, deletedAt: null, student: parentLinkedStudentWhere(user.id) },
        data: { isReadByParent: true },
      })
      await markLinkedContentNotificationsRead(tx.notification, {
        userId: user.id,
        relatedId: id,
        relatedTypes: ['PERFORMANCE_FEEDBACK', 'PERFORMANCE_UPDATE'],
        legacyHrefContains: `feedbackId=${encodeURIComponent(id)}`,
        readAt,
      })
    })
    post.isReadByParent = true
  }

  if (user.role === 'admin' || user.role === 'teacher') {
    await prisma.postComment.updateMany({
      where: { postId: id, author: { role: 'parent' }, isRead: false },
      data: { isRead: true },
    })
    post.comments = post.comments.map((comment) => comment.author.role === 'parent'
      ? { ...comment, isRead: true }
      : comment)
  }

  return NextResponse.json(post)
})

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  const user = session?.user as { id?: string; email?: string | null; name?: string | null; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'teacher'].includes(user.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const post = await prisma.performancePost.findFirst({ where: { id, deletedAt: null } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role !== 'admin') {
    const teacher = await resolveTeacherForUser({ id: user.id, email: user.email, name: user.name, role: user.role }, prisma)
    if (!teacher || teacher.id !== post.teacherId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const content = typeof body.content === 'string' ? body.content.trim() : undefined
  if (content !== undefined && !content) return NextResponse.json({ error: '内容不能为空' }, { status: 400 })

  const updated = await prisma.performancePost.update({
    where: { id },
    data: {
      ...(content !== undefined ? { content } : {}),
      ...(typeof body.mood === 'string' ? { mood: body.mood } : {}),
      ...(typeof body.type === 'string' ? { type: body.type } : {}),
      ...(typeof body.visibility === 'string' ? { visibility: body.visibility } : {}),
      ...(Array.isArray(body.tags) ? { tags: body.tags } : {}),
      ...(Array.isArray(body.images) ? { images: body.images } : {}),
      ...(body.ratings && typeof body.ratings === 'object' ? { ratings: body.ratings } : {}),
      ...(typeof body.isPinned === 'boolean' ? { isPinned: body.isPinned } : {}),
    },
  })
  revalidatePath('/performance')
  return NextResponse.json(updated)
})

export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  const user = session?.user as { id?: string; email?: string | null; name?: string | null; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'teacher'].includes(user.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const post = await prisma.performancePost.findFirst({ where: { id, deletedAt: null } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role !== 'admin') {
    const teacher = await resolveTeacherForUser({ id: user.id, email: user.email, name: user.name, role: user.role }, prisma)
    if (!teacher || teacher.id !== post.teacherId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.performancePost.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidatePath('/performance')
  return NextResponse.json({ success: true })
})
