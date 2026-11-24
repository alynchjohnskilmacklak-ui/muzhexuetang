import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { activeEnrollmentWhere, visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string; name?: string | null; division?: string } | undefined
  if (!user?.id || user.role !== 'admin') return null
  return {
    id: user.id,
    role: user.role,
    name: user.name || null,
    division: user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR',
  }
}

function divisionStudentWhere(division: string): Prisma.StudentWhereInput {
  return {
    ...visibleStudentWhere,
    division,
    enrollments: {
      some: {
        ...activeEnrollmentWhere,
        group: { ...visibleClassGroupWhere, division },
      },
    },
  }
}

function divisionPostWhere(division: string): Prisma.PerformancePostWhereInput {
  return {
    deletedAt: null,
    teacher: { status: { not: 'RESIGNED' } },
    student: divisionStudentWhere(division),
    OR: [
      { classLessonId: null },
      { classLesson: { division, group: { ...visibleClassGroupWhere, division } } },
    ],
  }
}

function divisionPaperWhere(division: string): Prisma.ExamPaperWhereInput {
  return {
    status: 'PUBLISHED',
    deletedAt: null,
    teacher: { status: { not: 'RESIGNED' } },
    student: divisionStudentWhere(division),
    OR: [
      { classLessonId: null },
      { classLesson: { division, group: { ...visibleClassGroupWhere, division } } },
    ],
  }
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
  const prisma = await getRequestPrisma()

  const { searchParams } = req.nextUrl
  const source = searchParams.get('source') || 'all'
  const notificationId = (searchParams.get('notificationId') || '').trim()
  const unreadOnly = searchParams.get('unread') === '1'
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit') || 50)))

  const postComments = notificationId || source === 'paper' || source === 'feedback'
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
          post: divisionPostWhere(user.division),
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

  const paperComments = notificationId || source === 'post' || source === 'feedback'
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
          paper: divisionPaperWhere(user.division),
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

  const notificationRows = source === 'post' || source === 'paper'
    ? []
    : await prisma.notification.findMany({
        where: {
          ...(notificationId ? { id: notificationId } : {}),
          user: { division: user.division },
          AND: [{ OR: [{ studentId: null }, { student: { division: user.division } }] }],
          status: 'ACTIVE',
          deletedAt: null,
          ...(source === 'feedback' ? { relatedType: 'CLASSROOM_FEEDBACK' } : {}),
          ...(unreadOnly ? { read: false } : {}),
          ...(q ? {
            OR: [
              { title: { contains: q } },
              { content: { contains: q } },
              { student: { name: { contains: q } } },
            ],
          } : {}),
        },
        select: {
          id: true,
          userId: true,
          title: true,
          content: true,
          relatedType: true,
          relatedId: true,
          href: true,
          link: true,
          read: true,
          createdAt: true,
          user: { select: { id: true, name: true, role: true } },
          sender: { select: { id: true, name: true, role: true } },
          student: { select: { id: true, name: true, parentName: true, parentPhone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

  const feedbackIds = [...new Set(notificationRows
    .filter((item) => item.relatedType === 'CLASSROOM_FEEDBACK' && item.relatedId)
    .map((item) => item.relatedId as string))]
  const feedbackTeachers = feedbackIds.length
    ? await prisma.classroomFeedback.findMany({
        where: { id: { in: feedbackIds }, classLesson: { division: user.division } },
        select: { id: true, teacher: { select: { id: true, name: true } } },
      })
    : []
  const feedbackTeacherMap = new Map(feedbackTeachers.map((item) => [item.id, item.teacher]))

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
    ...notificationRows.map((notification) => ({
      id: notification.id,
      type: 'notification',
      targetId: notification.id,
      scene: notification.relatedType === 'CLASSROOM_FEEDBACK' ? '课堂反馈通知' : '直接通知',
      content: notification.content,
      isRead: notification.read,
      createdAt: notification.createdAt,
      author: {
        id: notification.sender?.id || 'system',
        name: notification.sender?.name || '系统通知',
        role: notification.sender?.role || 'admin',
        label: roleLabel(notification.sender?.role || 'admin'),
      },
      parentUserId: notification.userId,
      isCurrentUserRecipient: notification.userId === user.id,
      parent: notification.user,
      student: notification.student,
      teacher: notification.relatedId ? feedbackTeacherMap.get(notification.relatedId) || null : null,
      targetTitle: notification.title,
      href: notification.href || notification.link,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit)

  const [unreadPostCount, unreadPaperCount, unreadNotificationCount] = await Promise.all([
    source === 'paper' || source === 'feedback' ? Promise.resolve(0) : prisma.postComment.count({
      where: {
        isRead: false,
        author: { role: 'parent' },
        post: divisionPostWhere(user.division),
      },
    }),
    source === 'post' || source === 'feedback' ? Promise.resolve(0) : prisma.paperComment.count({
      where: {
        isRead: false,
        author: { role: 'parent' },
        paper: divisionPaperWhere(user.division),
      },
    }),
    source === 'post' || source === 'paper' ? Promise.resolve(0) : prisma.notification.count({
      where: {
        user: { division: user.division },
        AND: [{ OR: [{ studentId: null }, { student: { division: user.division } }] }],
        status: 'ACTIVE',
        deletedAt: null,
        read: false,
        ...(source === 'feedback' ? { relatedType: 'CLASSROOM_FEEDBACK' } : {}),
      },
    }),
  ])
  const unreadCount = unreadPostCount + unreadPaperCount + unreadNotificationCount
  return NextResponse.json({ items, unreadCount })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const body = await req.json()
  const type = body.type === 'paper' ? 'paper' : body.type === 'notification' ? 'notification' : 'post'
  const targetId = typeof body.targetId === 'string' ? body.targetId : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!targetId || !content) return NextResponse.json({ error: '请填写回复内容' }, { status: 400 })

  if (type === 'notification') {
    const target = await prisma.notification.findFirst({
      where: {
        id: targetId,
        status: 'ACTIVE',
        deletedAt: null,
        user: { role: 'parent', division: user.division },
        OR: [{ studentId: null }, { student: { division: user.division, ...visibleStudentWhere } }],
      },
      select: { userId: true, studentId: true, title: true },
    })
    if (!target) return NextResponse.json({ error: '通知不存在' }, { status: 404 })
    const notification = await createNotification(prisma, {
      userId: target.userId,
      studentId: target.studentId,
      senderId: user.id,
      type: 'INFO',
      relatedType: 'ADMIN_REPLY',
      relatedId: targetId,
      title: `管理端回复：${target.title}`.slice(0, 80),
      content,
      href: '/parent/notifications',
    })
    revalidatePath('/parent/notifications')
    return NextResponse.json(notification, { status: 201 })
  }

  if (type === 'paper') {
    const paper = await prisma.examPaper.findFirst({
      where: { id: targetId, status: 'PUBLISHED', deletedAt: null, student: divisionStudentWhere(user.division), OR: [
        { classLessonId: null },
        { classLesson: { division: user.division, group: { ...visibleClassGroupWhere, division: user.division } } },
      ] },
      select: { id: true },
    })
    if (!paper) return NextResponse.json({ error: '学习档案不存在' }, { status: 404 })
    const comment = await prisma.paperComment.create({
      data: { paperId: targetId, authorId: user.id, content, isRead: true },
      include: { author: { select: { id: true, name: true, role: true } } },
    })
    await prisma.paperComment.updateMany({ where: { paperId: targetId, author: { role: 'parent' }, isRead: false }, data: { isRead: true } })
    revalidatePath('/parent/grades')
    return NextResponse.json(comment, { status: 201 })
  }

  const post = await prisma.performancePost.findFirst({ where: { id: targetId, ...divisionPostWhere(user.division) }, select: { id: true } })
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


  const prisma = await getRequestPrisma()
  const body = await req.json()
  const rawItems: unknown[] = Array.isArray(body.items) ? body.items : []
  const readItems = Array.from(new Map(rawItems.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const candidate = item as { id?: unknown; type?: unknown }
    if (typeof candidate.id !== 'string' || !candidate.id.trim()) return []
    if (candidate.type !== 'post' && candidate.type !== 'paper' && candidate.type !== 'notification') return []
    const normalized = { id: candidate.id.trim(), type: candidate.type }
    return [[`${normalized.type}:${normalized.id}`, normalized] as const]
  })).values()).slice(0, 100)

  if (readItems.length) {
    const updatedCount = await prisma.$transaction(async (tx) => {
      let count = 0
      for (const item of readItems) {
        const result = item.type === 'paper'
          ? await tx.paperComment.updateMany({
              where: { id: item.id, author: { role: 'parent' }, isRead: false, paper: divisionPaperWhere(user.division) },
              data: { isRead: true },
            })
          : item.type === 'notification'
            ? await tx.notification.updateMany({
              where: { id: item.id, userId: user.id, user: { division: user.division }, status: 'ACTIVE', read: false },
                data: { read: true, readAt: new Date() },
              })
            : await tx.postComment.updateMany({
              where: { id: item.id, author: { role: 'parent' }, isRead: false, post: divisionPostWhere(user.division) },
              data: { isRead: true },
            })
        count += result.count
      }
      return count
    })
    return NextResponse.json({ success: true, updatedCount })
  }

  const type = body.type === 'paper' ? 'paper' : body.type === 'notification' ? 'notification' : 'post'
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: '缺少留言ID' }, { status: 400 })

  if (type === 'notification') {
    await prisma.notification.updateMany({ where: { id, userId: user.id, user: { division: user.division }, status: 'ACTIVE', read: false }, data: { read: true, readAt: new Date() } })
  } else if (type === 'paper') {
    await prisma.paperComment.updateMany({ where: { id, author: { role: 'parent' }, isRead: false, paper: divisionPaperWhere(user.division) }, data: { isRead: true } })
  } else {
    await prisma.postComment.updateMany({ where: { id, author: { role: 'parent' }, isRead: false, post: divisionPostWhere(user.division) }, data: { isRead: true } })
  }
  return NextResponse.json({ success: true })
})

export const DELETE = apiHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') === 'paper' ? 'paper' : searchParams.get('type') === 'notification' ? 'notification' : 'post'
  const id = searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: '缺少留言ID' }, { status: 400 })

  if (type === 'notification') {
    await prisma.notification.updateMany({ where: { id, userId: user.id, user: { division: user.division }, status: 'ACTIVE' }, data: { status: 'DELETED' } })
    revalidatePath('/parent/notifications')
  } else if (type === 'paper') {
    await prisma.paperComment.deleteMany({ where: { id, author: { role: 'parent' }, paper: divisionPaperWhere(user.division) } })
    revalidatePath('/parent/grades')
  } else {
    await prisma.postComment.deleteMany({ where: { id, author: { role: 'parent' }, post: divisionPostWhere(user.division) } })
    revalidatePath('/parent/performance')
  }
  return NextResponse.json({ success: true })
})
