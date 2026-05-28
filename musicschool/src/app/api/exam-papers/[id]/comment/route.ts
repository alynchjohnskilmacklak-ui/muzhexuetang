import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const content = typeof body.content === 'string' ? body.content.trim() : ''

  if (!content) return NextResponse.json({ error: '请输入留言内容' }, { status: 400 })

  const paper = await prisma.examPaper.findUnique({
    where: { id },
    include: { student: { select: { name: true } }, teacher: { select: { id: true, name: true } } },
  })
  if (!paper || paper.status === 'DELETED') return NextResponse.json({ error: '试卷不存在' }, { status: 404 })

  const comment = await prisma.paperComment.create({
    data: { paperId: id, authorId: user.id, content },
    include: { author: { select: { id: true, name: true, role: true } } },
  })

  if (['teacher', 'admin'].includes(user.role || '') && paper.teacherId) {
    await prisma.paperComment.updateMany({
      where: { paperId: id, author: { role: 'parent' }, isRead: false },
      data: { isRead: true },
    })
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        teacherId: paper.teacherId,
        action: TEACHER_LOG_ACTIONS.COMMENT_REPLY,
        detail: `${paper.student.name} · ${content.slice(0, 60)}`,
        entityType: 'ExamPaper',
        entityId: id,
      },
    })
  }

  return NextResponse.json(comment, { status: 201 })
}
