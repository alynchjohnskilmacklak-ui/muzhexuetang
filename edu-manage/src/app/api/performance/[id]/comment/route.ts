import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { resolveTeacherForUser } from '@/lib/performance'
import { TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string; name?: string | null } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const body = await req.json()
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!content) return NextResponse.json({ error: '留言不能为空' }, { status: 400 })
  if (content.length > 200) return NextResponse.json({ error: '留言不能超过200字' }, { status: 400 })

  const teacher = ['teacher', 'admin'].includes(user.role || '')
    ? await resolveTeacherForUser({ id: user.id, name: user.name, role: user.role })
    : null
  const post = await prisma.performancePost.findFirst({
    where: teacher
      ? { id, deletedAt: null, teacherId: teacher.id }
      : {
          id,
          deletedAt: null,
          student: { OR: [{ parentId: user.id }, { parentUserId: user.id }], status: { not: 'INACTIVE' } },
        },
    include: { teacher: true, student: { select: { name: true } } },
  })
  if (!post) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const comment = await prisma.postComment.create({
    data: { postId: id, authorId: user.id, content },
    include: { author: { select: { name: true, role: true } } },
  })

  if (teacher) {
    await prisma.postComment.updateMany({
      where: { postId: id, author: { role: 'parent' }, isRead: false },
      data: { isRead: true },
    })
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        teacherId: teacher.id,
        action: TEACHER_LOG_ACTIONS.COMMENT_REPLY,
        detail: `${post.student.name}: ${content.slice(0, 60)}`,
        entityType: 'PerformancePost',
        entityId: id,
      },
    })
  }

  const teacherUser = teacher ? null : await prisma.user.findFirst({
    where: {
      role: { in: ['teacher', 'admin'] },
      OR: [
        post.teacher.email ? { email: post.teacher.email } : {},
        { name: post.teacher.name },
      ].filter((item) => Object.keys(item).length > 0),
    },
    select: { id: true },
  })
  if (teacherUser) {
    await prisma.notification.create({
      data: {
        userId: teacherUser.id,
        type: 'PARENT_COMMENT',
        title: '家长回复了您的动态',
        content: `${post.student.name}: ${content.slice(0, 50)}`,
        link: `/performance/${id}`,
      },
    })
  }

  return NextResponse.json(comment, { status: 201 })
})
