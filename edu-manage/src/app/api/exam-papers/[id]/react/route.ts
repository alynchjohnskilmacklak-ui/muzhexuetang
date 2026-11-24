import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { parentVisibleExamPaperWhere } from '@/lib/business-visibility'
import { resolveTeacherForUser } from '@/lib/performance'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  if (!['admin', 'teacher', 'parent'].includes(user.role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as { type?: unknown } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '请求内容无效' }, { status: 400 })
  }
  const type = body.type === undefined ? 'HEART' : body.type
  if (type !== 'HEART') {
    return NextResponse.json({ error: '不支持的试卷反馈类型' }, { status: 400 })
  }

  const teacher = user.role === 'teacher'
    ? await resolveTeacherForUser({ id: user.id, email: user.email, name: user.name, role: user.role }, prisma)
    : null
  if (user.role === 'teacher' && !teacher) {
    return NextResponse.json({ error: '试卷不存在' }, { status: 404 })
  }

  const scope = user.role === 'parent'
    ? parentVisibleExamPaperWhere(user.id)
    : user.role === 'teacher'
      ? { teacherId: teacher!.id, status: { not: 'DELETED' as const }, deletedAt: null }
      : { status: { not: 'DELETED' as const }, deletedAt: null }
  const paper = await prisma.examPaper.findFirst({
    where: { id, ...scope },
    select: { id: true },
  })
  if (!paper) return NextResponse.json({ error: '试卷不存在' }, { status: 404 })

  const existing = await prisma.paperReaction.findUnique({
    where: { paperId_userId: { paperId: id, userId: user.id } },
  })

  if (existing) {
    await prisma.paperReaction.delete({ where: { id: existing.id } })
    return NextResponse.json({ reacted: false })
  }

  await prisma.paperReaction.create({
    data: { paperId: id, userId: user.id, type },
  })

  return NextResponse.json({ reacted: true })
})
