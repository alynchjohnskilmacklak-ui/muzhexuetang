import { NextRequest, NextResponse } from 'next/server'
import { assertTeacherOwnsStudent, requireCurrentTeacher, TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'
import { MOOD_META } from '@/lib/performance'

export const dynamic = 'force-dynamic'

type OwnedStudent = NonNullable<Awaited<ReturnType<typeof assertTeacherOwnsStudent>>>

function normalizeIds(body: any) {
  if (Array.isArray(body.studentIds)) {
    return Array.from(new Set(body.studentIds.filter((item: unknown): item is string => typeof item === 'string' && item.length > 0)))
  }
  return typeof body.studentId === 'string' && body.studentId ? [body.studentId] : []
}

export async function GET() {
  try {
    const { teacher, prisma } = await requireCurrentTeacher()
    const posts = await prisma.performancePost.findMany({
      where: { teacherId: teacher.id, deletedAt: null },
      include: {
        student: { select: { id: true, name: true, grade: true } },
        comments: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    })
    return NextResponse.json(posts)
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, teacher, prisma } = await requireCurrentTeacher()
    const body = await request.json()
    const studentIds = normalizeIds(body)
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    const mood = typeof body.mood === 'string' && body.mood in MOOD_META ? body.mood as keyof typeof MOOD_META : 'GOOD'
    const tags = Array.isArray(body.tags) ? body.tags.filter((item: unknown): item is string => typeof item === 'string') : []
    const images = Array.isArray(body.images) ? body.images.filter((item: unknown): item is string => typeof item === 'string') : []

    if (studentIds.length === 0 || !content) {
      return NextResponse.json({ error: '请选择学员并填写表现内容' }, { status: 400 })
    }

    const ownedStudents: OwnedStudent[] = []
    for (const studentId of studentIds) {
      const student = await assertTeacherOwnsStudent(teacher.id, studentId)
      if (!student) return NextResponse.json({ error: '包含无权操作的学员' }, { status: 403 })
      ownedStudents.push(student)
    }

    const posts = await prisma.$transaction(async (tx) => {
      const created = []
      for (const student of ownedStudents) {
        const post = await tx.performancePost.create({
          data: {
            studentId: student.id,
            teacherId: teacher.id,
            type: typeof body.type === 'string' ? body.type : 'DAILY',
            mood,
            content,
            tags,
            images,
            visibility: 'PARENT_ONLY',
          },
        })
        created.push(post)

        if (student.parentId || student.parentUserId) {
          await tx.notification.create({
            data: {
              userId: student.parentId || student.parentUserId!,
              title: `${student.name}有新的课堂表现`,
              content: content.slice(0, 60),
              type: 'PERFORMANCE_FEEDBACK',
              link: '/parent/performance',
              relatedType: 'PERFORMANCE_FEEDBACK',
              relatedId: post.id,
              href: `/parent/growth?feedbackId=${post.id}`,
            },
          })
          await tx.performancePost.update({ where: { id: post.id }, data: { notifySent: true } })
        }

        await tx.activityLog.create({
          data: {
            userId: user.id,
            teacherId: teacher.id,
            action: TEACHER_LOG_ACTIONS.PERFORMANCE_POST,
            detail: `${student.name} · 情绪:${MOOD_META[mood].label} · 标签:${tags.join('/') || '-'}`,
            entityType: 'PerformancePost',
            entityId: post.id,
            metadata: { mood, tags, imageCount: images.length },
          },
        })
      }
      return created
    })

    return NextResponse.json({ count: posts.length, posts }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '发布失败' }, { status: 500 })
  }
}
