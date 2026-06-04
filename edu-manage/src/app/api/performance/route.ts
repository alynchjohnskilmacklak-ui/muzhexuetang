import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveTeacherForUser } from '@/lib/performance'
import { assertTeacherOwnsStudent, TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'
import { parentActiveStudentWhere, parentVisiblePerformancePostWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const POST_TYPES = new Set(['DAILY', 'HIGHLIGHT', 'WEEKLY_SUMMARY', 'ACHIEVEMENT'])
const MOODS = new Set(['GREAT', 'GOOD', 'OKAY', 'NEEDS_ATTENTION'])
const VISIBILITIES = new Set(['PARENT_ONLY', 'CLASS_PUBLIC'])

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id?: string; email?: string | null; name?: string | null; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'teacher', 'parent'].includes(user.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId') || ''
  const teacherId = searchParams.get('teacherId') || ''
  const type = searchParams.get('type') || ''
  const mood = searchParams.get('mood') || ''
  const unreadComments = searchParams.get('filter') === 'unread_comments'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))

  const where: Record<string, unknown> = {
    deletedAt: null,
    ...(studentId ? { studentId } : {}),
    ...(teacherId ? { teacherId } : {}),
    ...(type && POST_TYPES.has(type) ? { type } : {}),
    ...(mood && MOODS.has(mood) ? { mood } : {}),
    ...(unreadComments ? { comments: { some: { isRead: false, author: { role: 'parent' } } } } : {}),
  }

  if (user.role === 'parent') {
    const children = await prisma.student.findMany({
      where: parentActiveStudentWhere(user.id),
      select: { id: true },
    })
    const childIds = children.map((student) => student.id)
    if (!childIds.length) return NextResponse.json({ posts: [], total: 0, page, limit })
    if (studentId && !childIds.includes(studentId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    Object.assign(where, parentVisiblePerformancePostWhere(user.id), { studentId: studentId || { in: childIds } })
  }

  if (user.role === 'teacher') {
    const resolved = await resolveTeacherForUser({
      id: user.id || '',
      email: user.email as string,
      name: user.name as string,
      role: user.role,
    })
    if (!resolved) return NextResponse.json({ posts: [], total: 0, page, limit })
    Object.assign(where, { teacherId: resolved.id })
  }

  const [posts, total] = await Promise.all([
    prisma.performancePost.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, grade: true, remainHours: true } },
        teacher: { select: { id: true, name: true, avatar: true } },
        reactions: true,
        comments: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
        badges: true,
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.performancePost.count({ where }),
  ])

  if (user.role === 'parent') {
    const unreadIds = posts.filter((post) => !post.isReadByParent).map((post) => post.id)
    if (unreadIds.length) {
      await prisma.performancePost.updateMany({ where: { id: { in: unreadIds } }, data: { isReadByParent: true } })
    }
  }

  return NextResponse.json({ posts, total, page, limit })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id?: string; email?: string | null; name?: string | null; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'teacher'].includes(user.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const teacher = await resolveTeacherForUser({ id: user.id, email: user.email, name: user.name, role: user.role })
  if (!teacher) return NextResponse.json({ error: '没有匹配到教师档案，请先创建教师资料' }, { status: 400 })

  const body = await req.json()
  const rawIds = Array.isArray(body.studentIds)
    ? body.studentIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : typeof body.studentId === 'string' && body.studentId
      ? [body.studentId]
      : []
  const uniqueIds: string[] = Array.from(new Set<string>(rawIds))
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const type = POST_TYPES.has(body.type) ? body.type : 'DAILY'
  const mood = MOODS.has(body.mood) ? body.mood : 'GOOD'
  const visibility = VISIBILITIES.has(body.visibility) ? body.visibility : 'PARENT_ONLY'
  const images = asStringArray(body.images).slice(0, 9)
  const tags = asStringArray(body.tags).slice(0, 20)
  const badges = asStringArray(body.badges).slice(0, 1)
  const classLessonId = typeof body.classLessonId === 'string' && body.classLessonId ? body.classLessonId : null
  const ratings = body.ratings && typeof body.ratings === 'object' ? body.ratings : undefined

  if (uniqueIds.length === 0) return NextResponse.json({ error: '请选择学员' }, { status: 400 })
  if (uniqueIds.length > 20) return NextResponse.json({ error: '每次最多发布20位学员' }, { status: 400 })
  if (!content) return NextResponse.json({ error: '请填写表现内容' }, { status: 400 })
  if (content.length > 300) return NextResponse.json({ error: '内容不能超过300字' }, { status: 400 })

  const results = []

  for (const studentId of uniqueIds) {
    const student = user.role === 'teacher'
      ? await assertTeacherOwnsStudent(teacher.id, studentId)
      : await prisma.student.findFirst({
          where: { id: studentId, status: { not: 'INACTIVE' } },
          select: { id: true, name: true, parentId: true, parentUserId: true },
        })
    if (!student) return NextResponse.json({ error: '学员不存在或无权限' }, { status: 404 })

    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.performancePost.create({
        data: { studentId, teacherId: teacher.id, classLessonId, type, mood, content, images, tags, ratings, visibility },
      })

      if (badges.length) {
        await tx.postBadge.createMany({ data: badges.map((badgeType) => ({ postId: created.id, badgeType })) })
        await tx.achievementBadge.createMany({
          data: badges.map((badgeType) => ({ studentId, teacherId: teacher.id, badgeType, description: content.slice(0, 80) })),
        })
      }

      await tx.activityLog.create({
        data: {
          userId: user.id,
          teacherId: teacher.id,
          action: TEACHER_LOG_ACTIONS.PERFORMANCE_POST,
          detail: `${student.name} · ${mood}`,
          entityType: 'PerformancePost',
          entityId: created.id,
          metadata: { mood, tags, ratings, badges },
        },
      })

      return created
    })

    const parentUserId = student.parentId || student.parentUserId
    if (parentUserId) {
      await prisma.notification.create({
        data: {
          userId: parentUserId,
          type: 'PERFORMANCE_UPDATE',
          title: `${student.name}有新的课堂表现`,
          content: content.slice(0, 60),
          link: '/parent/performance',
        },
      })
      await prisma.performancePost.update({ where: { id: post.id }, data: { notifySent: true } })
    }

    results.push(post)
  }

  revalidatePath('/performance')
  revalidatePath('/teacher/performance')
  return NextResponse.json({ count: results.length, posts: results }, { status: 201 })
})
