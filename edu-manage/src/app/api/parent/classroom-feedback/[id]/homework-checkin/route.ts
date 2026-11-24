import { NextRequest, NextResponse } from 'next/server'
import { createNotification } from '@/lib/notifications'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { qywxEnabled } from '@/lib/qywx'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

async function getAuthorizedCheckin(prisma: Awaited<ReturnType<typeof getRequestPrisma>>, parentId: string, feedbackId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, deletedAt: null, ...parentLinkedStudentWhere(parentId) },
    select: { id: true, name: true },
  })
  if (!student) return { status: 403 as const, feedback: null, student: null }

  const feedback = await prisma.classroomFeedback.findFirst({
    where: { id: feedbackId, status: 'PUBLISHED', deletedAt: null, studentIds: { has: studentId } },
    select: { id: true, teacherId: true, teacher: { select: { name: true } } },
  })
  if (!feedback) return { status: 404 as const, feedback: null, student }
  return { status: null, feedback, student }
}

export const GET = apiHandler(async (request: NextRequest, context: RouteContext) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: '只有家长可以登记作业进度' }, { status: 403 })

  const studentId = request.nextUrl.searchParams.get('studentId') || ''
  if (!studentId) return NextResponse.json({ error: '缺少学员编号' }, { status: 400 })
  const { id: feedbackId } = await context.params
  const prisma = await getRequestPrisma()
  const access = await getAuthorizedCheckin(prisma, user.id, feedbackId, studentId)
  if (access.status) return NextResponse.json({ error: access.status === 404 ? '课堂反馈不存在' : '无权查看此作业进度' }, { status: access.status })

  const checkin = await prisma.classroomFeedbackHomeworkCheckin.findUnique({
    where: { feedbackId_studentId_parentUserId: { feedbackId, studentId, parentUserId: user.id } },
    select: { status: true, note: true, submittedAt: true },
  })
  return NextResponse.json({
    checkin: checkin ? { status: checkin.status, note: checkin.note, submittedAt: checkin.submittedAt.toISOString() } : null,
  })
})

export const POST = apiHandler(async (request: NextRequest, context: RouteContext) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: '只有家长可以登记作业进度' }, { status: 403 })

  const body = await request.json().catch(() => null) as { studentId?: unknown; status?: unknown; note?: unknown } | null
  const studentId = typeof body?.studentId === 'string' ? body.studentId : ''
  if (!studentId || (body?.status !== 'DONE' && body?.status !== 'NEED_HELP')) {
    return NextResponse.json({ error: '请选择作业已完成或需要帮助' }, { status: 400 })
  }
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  if (body.status === 'NEED_HELP' && note.length < 3) {
    return NextResponse.json({ error: '请简单说明遇到的困难，方便老师跟进' }, { status: 400 })
  }
  if (note.length > 500) return NextResponse.json({ error: '补充说明不能超过 500 个字' }, { status: 400 })

  const { id: feedbackId } = await context.params
  const prisma = await getRequestPrisma()
  const access = await getAuthorizedCheckin(prisma, user.id, feedbackId, studentId)
  if (access.status || !access.feedback || !access.student) {
    return NextResponse.json({ error: access.status === 404 ? '课堂反馈不存在' : '无权登记此作业进度' }, { status: access.status || 403 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const where = { feedbackId_studentId_parentUserId: { feedbackId, studentId, parentUserId: user.id } }
    const previous = await tx.classroomFeedbackHomeworkCheckin.findUnique({ where, select: { status: true } })
    const checkin = await tx.classroomFeedbackHomeworkCheckin.upsert({
      where,
      create: { feedbackId, studentId, parentUserId: user.id, status: body.status as string, note: note || null },
      update: { status: body.status as string, note: note || null, submittedAt: new Date() },
      select: { status: true, note: true, submittedAt: true },
    })

    let notifiedTeacher = false
    if (body.status === 'NEED_HELP' && previous?.status !== 'NEED_HELP') {
      const teacherUser = await tx.user.findFirst({
        where: { teacherId: access.feedback.teacherId, role: 'teacher', status: 'active' },
        select: { id: true },
      })
      if (teacherUser) {
        await createNotification(tx, {
          userId: teacherUser.id,
          studentId,
          type: 'HOMEWORK_HELP_REQUEST',
          title: '家长反馈：本节作业需要帮助',
          content: `${access.student.name}的家长反馈作业遇到困难：${note}`,
          relatedType: 'HOMEWORK_CHECKIN',
          relatedId: feedbackId,
          href: '/teacher/feedback',
          pushStatus: qywxEnabled() ? 'queued' : 'none',
        })
        notifiedTeacher = true
      }
    }
    return { checkin, notifiedTeacher }
  })

  return NextResponse.json({
    ok: true,
    notifiedTeacher: result.notifiedTeacher,
    checkin: { status: result.checkin.status, note: result.checkin.note, submittedAt: result.checkin.submittedAt.toISOString() },
  }, { status: 200 })
})
