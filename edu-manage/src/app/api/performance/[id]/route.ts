import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveTeacherForUser } from '@/lib/performance'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await prisma.performancePost.findFirst({
    where: { id, deletedAt: null },
    include: {
      student: true,
      teacher: true,
      reactions: true,
      comments: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
      badges: true,
    },
  })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(post)
})

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  const user = session?.user as { id?: string; email?: string | null; name?: string | null; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'teacher'].includes(user.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const post = await prisma.performancePost.findFirst({ where: { id, deletedAt: null } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role !== 'admin') {
    const teacher = await resolveTeacherForUser({ id: user.id, email: user.email, name: user.name, role: user.role })
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

  const { id } = await params
  const post = await prisma.performancePost.findFirst({ where: { id, deletedAt: null } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role !== 'admin') {
    const teacher = await resolveTeacherForUser({ id: user.id, email: user.email, name: user.name, role: user.role })
    if (!teacher || teacher.id !== post.teacherId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.performancePost.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidatePath('/performance')
  return NextResponse.json({ success: true })
})
