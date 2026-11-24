import { NextRequest, NextResponse } from 'next/server'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export const GET = apiHandler(async (request: NextRequest, context: RouteContext) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: '只有家长可以查看管理批示' }, { status: 403 })

  const studentId = request.nextUrl.searchParams.get('studentId') || ''
  if (!studentId) return NextResponse.json({ error: '缺少学员编号' }, { status: 400 })

  const { id: feedbackId } = await context.params
  const prisma = await getRequestPrisma()
  const student = await prisma.student.findFirst({
    where: { id: studentId, deletedAt: null, ...parentLinkedStudentWhere(user.id) },
    select: { id: true },
  })
  if (!student) return NextResponse.json({ error: '无权查看该学员的批示' }, { status: 403 })

  const feedback = await prisma.classroomFeedback.findFirst({
    where: { id: feedbackId, status: 'PUBLISHED', deletedAt: null, studentIds: { has: studentId } },
    select: { id: true },
  })
  if (!feedback) return NextResponse.json({ error: '课堂反馈不存在' }, { status: 404 })

  const replies = await prisma.classroomFeedbackPracticeReply.findMany({
    where: { feedbackId, studentId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, content: true, imageUrls: true, createdAt: true },
  })

  return NextResponse.json({
    replies: replies.map((reply) => ({ ...reply, createdAt: reply.createdAt.toISOString() })),
  })
})
