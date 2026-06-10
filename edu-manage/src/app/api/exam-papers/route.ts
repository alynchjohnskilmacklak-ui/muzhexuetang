import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { resolveTeacherForUser } from '@/lib/performance'
import { parentVisibleExamPaperWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')
  const teacherId = searchParams.get('teacherId')
  const subject = searchParams.get('subject')
  const status = searchParams.get('status')
  const mine = searchParams.get('mine')

  const where: Record<string, unknown> = {}
  if (mine === 'true' && user.role === 'parent') {
    Object.assign(where, parentVisibleExamPaperWhere(user.id))
  } else if (user.role === 'admin' || user.role === 'teacher') {
    if (studentId) where.studentId = studentId
    if (teacherId) where.teacherId = teacherId
    if (subject) where.subject = subject
    if (status) where.status = status
    else where.status = { not: 'DELETED' }
  }
  if (Object.keys(where).length === 0) {
    where.status = { not: 'DELETED' }
  }

  const papers = await prisma.examPaper.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, grade: true } },
      teacher: { select: { id: true, name: true } },
      questions: { orderBy: { order: 'asc' } },
      reactions: { select: { id: true, type: true, userId: true } },
      comments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      _count: { select: { questions: true, reactions: true, comments: true } },
    },
    orderBy: { paperDate: 'desc' },
  })

  return NextResponse.json({ papers }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
  })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json()
  const { studentId, classLessonId, title, subject, paperDate, tags } = body

  if (!studentId || !title || !subject) {
    return NextResponse.json({ error: '请填写学员、标题和科目' }, { status: 400 })
  }

  const teacher = await resolveTeacherForUser({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
  if (!teacher) {
    return NextResponse.json({ error: '没有匹配到教师档案，请先在教师管理中创建至少一位在职教师' }, { status: 400 })
  }

  const paper = await prisma.examPaper.create({
    data: {
      studentId,
      teacherId: teacher.id,
      classLessonId: classLessonId || null,
      title,
      subject,
      paperDate: paperDate ? new Date(paperDate) : new Date(),
      tags: Array.isArray(tags) ? tags : [],
      imageUrls: [],
      status: 'DRAFT',
    },
    include: { student: { select: { id: true, name: true } }, teacher: { select: { id: true, name: true } } },
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '创建试卷', detail: `${title} - ${subject}` },
  })

  return NextResponse.json(paper, { status: 201 })
})
