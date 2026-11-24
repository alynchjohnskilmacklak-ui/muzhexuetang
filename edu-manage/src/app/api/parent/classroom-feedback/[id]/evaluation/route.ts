import { NextRequest, NextResponse } from 'next/server'
import { createManyNotifications } from '@/lib/notifications'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

async function getAuthorizedFeedback(prisma: Awaited<ReturnType<typeof getRequestPrisma>>, parentId: string, feedbackId: string) {
  const feedback = await prisma.classroomFeedback.findFirst({
    where: { id: feedbackId, status: 'PUBLISHED', deletedAt: null },
    select: {
      id: true,
      studentIds: true,
      isSingleSession: true,
      teacher: { select: { name: true, division: true } },
      classLesson: {
        select: {
          subject: true,
          group: { select: { division: true, course: { select: { subject: true } } } },
        },
      },
    },
  })
  if (!feedback) return { feedback: null, linkedStudents: [], status: 404 as const }

  const linkedStudents = feedback.studentIds.length
    ? await prisma.student.findMany({
        where: {
          id: { in: feedback.studentIds },
          ...parentLinkedStudentWhere(parentId),
        },
        select: { id: true, name: true },
      })
    : []
  const directReceipt = feedback.isSingleSession && feedback.studentIds.length === 0
    ? await prisma.feedbackParentReadReceipt.findUnique({
        where: { feedbackId_parentUserId: { feedbackId, parentUserId: parentId } },
        select: { feedbackId: true },
      })
    : null

  if (linkedStudents.length === 0 && !directReceipt) {
    return { feedback: null, linkedStudents: [], status: 403 as const }
  }

  return { feedback, linkedStudents, status: null }
}

export const GET = apiHandler(async (_request: NextRequest, context: RouteContext) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: '无权查看家长评价' }, { status: 403 })

  const { id } = await context.params
  const prisma = await getRequestPrisma()
  const access = await getAuthorizedFeedback(prisma, user.id, id)
  if (access.status) {
    return NextResponse.json({ error: access.status === 404 ? '课堂反馈不存在' : '无权评价此课堂反馈' }, { status: access.status })
  }

  const evaluation = await prisma.parentClassroomFeedbackEvaluation.findUnique({
    where: { feedbackId_parentUserId: { feedbackId: id, parentUserId: user.id } },
    select: { satisfied: true, reason: true, createdAt: true },
  })
  return NextResponse.json({
    evaluation: evaluation ? {
      rating: evaluation.satisfied ? 'SATISFIED' : 'UNSATISFIED',
      reason: evaluation.reason,
      createdAt: evaluation.createdAt.toISOString(),
    } : null,
  })
})

export const POST = apiHandler(async (request: NextRequest, context: RouteContext) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: '只有家长可以提交此评价' }, { status: 403 })

  const body = await request.json().catch(() => null) as { rating?: unknown; reason?: unknown } | null
  if (body?.rating !== 'SATISFIED' && body?.rating !== 'UNSATISFIED') {
    return NextResponse.json({ error: '请选择满意或不满意' }, { status: 400 })
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (body.rating === 'UNSATISFIED' && reason.length < 5) {
    return NextResponse.json({ error: '请至少用 5 个字说明不满意的原因' }, { status: 400 })
  }
  if (reason.length > 800) {
    return NextResponse.json({ error: '评价内容不能超过 800 个字' }, { status: 400 })
  }

  const { id } = await context.params
  const prisma = await getRequestPrisma()
  const access = await getAuthorizedFeedback(prisma, user.id, id)
  if (access.status || !access.feedback) {
    return NextResponse.json({ error: access.status === 404 ? '课堂反馈不存在' : '无权评价此课堂反馈' }, { status: access.status || 403 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.parentClassroomFeedbackEvaluation.findUnique({
        where: { feedbackId_parentUserId: { feedbackId: id, parentUserId: user.id } },
        select: { id: true },
      })
      if (existing) return { alreadySubmitted: true, notifiedAdmins: 0 }

      const evaluation = await tx.parentClassroomFeedbackEvaluation.create({
        data: {
          feedbackId: id,
          parentUserId: user.id,
          satisfied: body.rating === 'SATISFIED',
          reason: body.rating === 'UNSATISFIED' ? reason : null,
          reviewStatus: 'PENDING',
        },
        select: { id: true, satisfied: true, reason: true, createdAt: true },
      })

      const division = access.feedback.classLesson?.group?.division || access.feedback.teacher?.division
      const admins = division ? await tx.user.findMany({
        where: {
          role: 'admin',
          status: 'active',
          division,
        },
        select: { id: true },
      }) : []
      const subject = access.feedback.classLesson?.subject
        || access.feedback.classLesson?.group?.course?.subject
        || '课堂'
      const teacherName = access.feedback.teacher?.name || '任课老师'
      const content = evaluation.satisfied
        ? `${user.name || '一位家长'}对${teacherName}的${subject}课堂反馈表示满意，可纳入教师奖励评估。`
        : `${user.name || '一位家长'}对${teacherName}的${subject}课堂反馈表示不满意：${reason}`
      const notifications = await createManyNotifications(tx, admins.map((admin) => ({
        userId: admin.id,
        type: 'FEEDBACK_REVIEW',
        title: evaluation.satisfied ? '收到家长的课堂满意评价' : '收到家长的课堂不满意评价',
        content,
        relatedType: 'CLASSROOM_FEEDBACK_REVIEW',
        relatedId: evaluation.id,
        studentId: access.linkedStudents[0]?.id,
        href: `/parent-feedback-reviews?evaluationId=${encodeURIComponent(evaluation.id)}`,
      })))

      return { alreadySubmitted: false, notifiedAdmins: notifications.count, evaluation }
    })

    if (result.alreadySubmitted) {
      return NextResponse.json({ error: '这条课堂反馈已经提交过评价', alreadySubmitted: true }, { status: 409 })
    }
    return NextResponse.json({
      ok: true,
      notifiedAdmins: result.notifiedAdmins,
      evaluation: result.evaluation ? {
        rating: result.evaluation.satisfied ? 'SATISFIED' : 'UNSATISFIED',
        reason: result.evaluation.reason,
        createdAt: result.evaluation.createdAt.toISOString(),
      } : null,
    }, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: '这条课堂反馈已经提交过评价', alreadySubmitted: true }, { status: 409 })
    }
    throw error
  }
})
