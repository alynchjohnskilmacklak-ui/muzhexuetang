import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { createManyNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const comment = typeof body?.teacherComment === 'string' ? body.teacherComment.trim() : ''
  const score = body?.score === null || body?.score === undefined || body?.score === '' ? null : Number(body.score)
  if (!comment && score === null) return NextResponse.json({ error: '请填写批改意见或成绩' }, { status: 400 })
  if (comment.length > 2000 || (score !== null && (!Number.isFinite(score) || score < 0 || score > 100))) return NextResponse.json({ error: '批改意见或成绩格式无效' }, { status: 400 })
  const submission = await prisma.homeworkSubmission.findFirst({ where: { id, assignment: { teacherId: teacher.id } }, include: { assignment: { select: { title: true } }, student: { select: { name: true } }, parent: { select: { id: true } } } })
  if (!submission) return NextResponse.json({ error: '作业提交不存在或无权批改' }, { status: 404 })
  const reviewed = await prisma.homeworkSubmission.update({ where: { id }, data: { status: 'REVIEWED', score, teacherComment: comment || null, reviewedById: user.id, reviewedAt: new Date() } })
  await createManyNotifications(prisma, [{ userId: submission.parentUserId, type: 'HOMEWORK_REVIEWED', title: `作业已批改：${submission.assignment.title}`, content: `${submission.student.name}的作业已批改，请查看老师评语。`, relatedType: 'HOMEWORK_SUBMISSION', relatedId: id, studentId: submission.studentId, href: '/parent/homework', pushStatus: 'queued' }])
  return NextResponse.json({ submission: reviewed })
})
