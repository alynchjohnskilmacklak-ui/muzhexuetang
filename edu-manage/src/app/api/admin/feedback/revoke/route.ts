import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { FeedbackRewardReversalError, reverseFeedbackRewardTransactions } from '@/lib/feedback-reward-reversal'

export const dynamic = 'force-dynamic'

/**
 * 管理端撤销课堂反馈（软删除），同时取消未结算奖励或冲销已结算奖励。
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '仅管理员可撤销反馈' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const feedbackId = typeof body.feedbackId === 'string' ? body.feedbackId : ''
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null

  if (!feedbackId) {
    return NextResponse.json({ error: '缺少反馈编号' }, { status: 400 })
  }

  const prisma = await getRequestPrisma()
  const feedback = await prisma.classroomFeedback.findFirst({
    where: { id: feedbackId, deletedAt: null },
    include: {
      teacher: { select: { name: true, division: true } },
      classLesson: { select: { group: { select: { name: true } } } },
    },
  })
  if (!feedback) {
    return NextResponse.json({ error: '反馈不存在或已撤销' }, { status: 404 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      const revokedAt = new Date()
      const claim = await tx.classroomFeedback.updateMany({
        where: { id: feedbackId, deletedAt: null },
        data: { deletedAt: revokedAt, status: 'REVOKED' },
      })
      if (claim.count !== 1) {
        throw new FeedbackRewardReversalError('FEEDBACK_REVOKE_CONFLICT', '反馈已被其他操作撤销，请刷新后核对')
      }

      await tx.feedbackRewardRecord.updateMany({
        where: { feedbackId, isActive: true },
        data: { isActive: false, invalidReason: reason || '管理撤销反馈' },
      })
      const activeTerm = feedback.teacher?.division
        ? await tx.academicTerm.findFirst({
          where: { division: feedback.teacher.division, status: 'ACTIVE' },
          select: { id: true },
        })
        : null
      const salaryReversal = await reverseFeedbackRewardTransactions(tx, feedbackId, activeTerm?.id || null, revokedAt)

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'ADMIN_FEEDBACK_REVOKE',
          detail: `${feedback.teacher?.name || '教师'} 的课堂反馈已撤销${feedback.classLesson?.group?.name ? `（${feedback.classLesson.group.name}）` : ''}${reason ? `：${reason}` : ''}`,
          entityType: 'ClassroomFeedback',
          entityId: feedbackId,
          metadata: { reason, salaryReversal },
        },
      })
    })
  } catch (error) {
    if (error instanceof FeedbackRewardReversalError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 })
    }
    throw error
  }

  return NextResponse.json({
    success: true,
    message: '反馈已撤销，家长端不再可见；奖励流水已取消或冲销',
  })
})
