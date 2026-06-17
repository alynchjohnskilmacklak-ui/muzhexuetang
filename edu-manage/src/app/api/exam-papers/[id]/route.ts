import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { revalidatePath } from 'next/cache'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const paper = await prisma.examPaper.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, grade: true, parentUserId: true } },
      teacher: { select: { id: true, name: true } },
      questions: { orderBy: { order: 'asc' } },
      reactions: { select: { id: true, type: true, userId: true } },
      comments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      classLesson: { select: { id: true, lessonDate: true } },
    },
  })

  if (!paper) return NextResponse.json({ error: '试卷不存在' }, { status: 404 })
  if (paper.status === 'DELETED') return NextResponse.json({ error: '试卷已删除' }, { status: 404 })

  // Ownership check
  if (user.role === 'parent' && paper.student.parentUserId !== user.id) {
    return NextResponse.json({ error: '试卷不存在' }, { status: 404 })
  }
  if (user.role === 'teacher' && paper.teacherId !== user.teacherId) {
    return NextResponse.json({ error: '试卷不存在' }, { status: 404 })
  }

  return NextResponse.json(paper)
})

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const body = await req.json()

  const existing = await prisma.examPaper.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '试卷不存在' }, { status: 404 })

  // Parents can only mark as read
  if (user.role === 'parent') {
    if (body.isReadByParent) {
      const updated = await prisma.examPaper.update({
        where: { id },
        data: { isReadByParent: true, readAt: new Date() },
      })
      revalidatePath('/parent/grades')
      return NextResponse.json(updated)
    }
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  if (user.role !== 'admin' && user.role !== 'teacher') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const updateData: Record<string, unknown> = {}
  if (typeof body.title === 'string') updateData.title = body.title
  if (typeof body.subject === 'string') updateData.subject = body.subject
  if (body.paperDate) updateData.paperDate = new Date(body.paperDate)
  if (Array.isArray(body.imageUrls)) updateData.imageUrls = body.imageUrls
  if (typeof body.fileUrl === 'string') updateData.fileUrl = body.fileUrl || null
  if (Array.isArray(body.tags)) updateData.tags = body.tags
  if (typeof body.overallComment === 'string') updateData.overallComment = body.overallComment || null
  if (typeof body.status === 'string') updateData.status = body.status
  updateData.updatedAt = new Date()

  const paper = await prisma.examPaper.update({
    where: { id },
    data: updateData,
    include: {
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      questions: { orderBy: { order: 'asc' } },
    },
  })

  if (body.status || body.title) {
    revalidatePath('/grades')
    revalidatePath('/parent/grades')
  }

  return NextResponse.json(paper)
})

export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()

  const { id } = await params
  const paper = await prisma.examPaper.update({
    where: { id },
    data: { status: 'DELETED', updatedAt: new Date() },
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '删除试卷', detail: paper.title },
  })

  revalidatePath('/grades')
  revalidatePath('/parent/grades')

  return NextResponse.json({ success: true })
})
