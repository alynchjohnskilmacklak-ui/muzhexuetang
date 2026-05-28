import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { activeEnrollmentWhere, visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string; name?: string | null } | undefined
  if (!user?.id || user.role !== 'admin') return null
  return { id: user.id, role: user.role, name: user.name || null }
}

function roleLabel(role?: string | null) {
  if (role === 'parent') return '家长'
  if (role === 'teacher') return '老师'
  if (role === 'admin') return '管理端'
  return '未知'
}

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const source = searchParams.get('source') || 'all'
  const unreadOnly = searchParams.get('unread') === '1'
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit') || 50)))

  const postComments = source === 'paper'
    ? []
    : await prisma.postComment.findMany({
        where: {
          ...(unreadOnly ? { isRead: false, author: { role: 'parent' } } : {}),
          ...(q ? {
            OR: [
              { content: { contains: q } },
              { post: { student: { name: { contains: q } } } },
              { post: { teacher: { name: { contains: q } } } },
            ],
          } : {}),
          post: {
            deletedAt: null,
            teacher: { status: { not: 'RESIGNED' } },
            student: { ...visibleStudentWhere, enrollments: { some: activeEnrollmentWhere } },
            OR: [
              { classLessonId: null },
              { classLesson: { group: visibleClassGroupWhere } },
            ],
          },
        },
        include: {
          author: { select: { id: true, name: true, role: true } },
          post: {
            select: {
              id: true,
              content: true,
              student: { select: { id: true, name: true, parentName: true, parentPhone: true } },
              teacher: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

  const paperComments = source === 'post'
    ? []
    : await prisma.paperComment.findMany({
        where: {
          ...(unreadOnly ? { isRead: false, author: { role: 'parent' } } : {}),
          ...(q ? {
            OR: [
              { content: { contains: q } },
              { paper: { title: { contains: q } } },
              { paper: { student: { name: { contains: q } } } },
              { paper: { teacher: { name: { contains: q } } } },
            ],
          } : {}),
          paper: {
            status: 'PUBLISHED',
            teacher: { status: { not: 'RESIGNED' } },
            student: { ...visibleStudentWhere, enrollments: { some: activeEnrollmentWhere } },
            OR: [
              { classLessonId: null },
              { classLesson: { group: visibleClassGroupWhere } },
            ],
          },
        },
        include: {
          author: { select: { id: true, name: true, role: true } },
          paper: {
            select: {
              id: true,
              title: true,
              subject: true,
              student: { select: { id: true, name: true, parentName: true, parentPhone: true } },
              teacher: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

  const items = [
    ...postComments.map((comment) => ({
      id: comment.id,
      type: 'post',
      targetId: comment.postId,
      scene: '表现反馈',
      content: comment.content,
      isRead: comment.isRead,
      createdAt: comment.createdAt,
      author: { ...comment.author, label: roleLabel(comment.author.role) },
      student: comment.post.student,
      teacher: comment.post.teacher,
      targetTitle: comment.post.content.slice(0, 40),
    })),
    ...paperComments.map((comment) => ({
      id: comment.id,
      type: 'paper',
      targetId: comment.paperId,
      scene: '学习档案',
      content: comment.content,
      isRead: comment.isRead,
      createdAt: comment.createdAt,
      author: { ...comment.author, label: roleLabel(comment.author.role) },
      student: comment.paper.student,
      teacher: comment.paper.teacher,
      targetTitle: `${comment.paper.subject} · ${comment.paper.title}`,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit)

  const unreadCount = items.filter((item) => item.author.role === 'parent' && !item.isRead).length
  return NextResponse.json({ items, unreadCount })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const type = body.type === 'paper' ? 'paper' : 'post'
  const targetId = typeof body.targetId === 'string' ? body.targetId : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!targetId || !content) return NextResponse.json({ error: '请填写回复内容' }, { status: 400 })

  if (type === 'paper') {
    const paper = await prisma.examPaper.findFirst({ where: { id: targetId, status: { not: 'DELETED' } }, select: { id: true } })
    if (!paper) return NextResponse.json({ error: '学习档案不存在' }, { status: 404 })
    const comment = await prisma.paperComment.create({
      data: { paperId: targetId, authorId: user.id, content, isRead: true },
      include: { author: { select: { id: true, name: true, role: true } } },
    })
    await prisma.paperComment.updateMany({ where: { paperId: targetId, author: { role: 'parent' }, isRead: false }, data: { isRead: true } })
    revalidatePath('/parent/grades')
    return NextResponse.json(comment, { status: 201 })
  }

  const post = await prisma.performancePost.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } })
  if (!post) return NextResponse.json({ error: '表现反馈不存在' }, { status: 404 })
  const comment = await prisma.postComment.create({
    data: { postId: targetId, authorId: user.id, content, isRead: true },
    include: { author: { select: { id: true, name: true, role: true } } },
  })
  await prisma.postComment.updateMany({ where: { postId: targetId, author: { role: 'parent' }, isRead: false }, data: { isRead: true } })
  revalidatePath('/parent/performance')
  return NextResponse.json(comment, { status: 201 })
})

export const PATCH = apiHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const type = body.type === 'paper' ? 'paper' : 'post'
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: '缺少留言ID' }, { status: 400 })

  if (type === 'paper') {
    await prisma.paperComment.update({ where: { id }, data: { isRead: true } })
  } else {
    await prisma.postComment.update({ where: { id }, data: { isRead: true } })
  }
  return NextResponse.json({ success: true })
})

export const DELETE = apiHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') === 'paper' ? 'paper' : 'post'
  const id = searchParams.get('id') || ''
  const targetId = searchParams.get('targetId') || ''
  if (!id && !targetId) return NextResponse.json({ error: '缺少留言ID' }, { status: 400 })

  if (type === 'paper') {
    await prisma.paperComment.deleteMany({ where: targetId ? { paperId: targetId } : { id } })
    revalidatePath('/parent/grades')
  } else {
    await prisma.postComment.deleteMany({ where: targetId ? { postId: targetId } : { id } })
    revalidatePath('/parent/performance')
  }
  return NextResponse.json({ success: true })
})
