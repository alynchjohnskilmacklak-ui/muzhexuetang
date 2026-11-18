import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

/**
 * 管理端撤销课堂反馈（软删除）。
 * 场景：学生没来但教师发了反馈，管理撤销，家长端不再可见，奖励记录同步失效。
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
      teacher: { select: { name: true } },
      classLesson: { select: { group: { select: { name: true } } } },
    },
  })
  if (!feedback) {
    return NextResponse.json({ error: '反馈不存在或已撤销' }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.classroomFeedback.update({
      where: { id: feedbackId },
      data: { deletedAt: new Date(), status: 'REVOKED' },
    })
    await tx.feedbackRewardRecord.updateMany({
      where: { feedbackId, isActive: true },
      data: { isActive: false, invalidReason: reason || '管理撤销反馈' },
    })
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_FEEDBACK_REVOKE',
        detail: `${feedback.teacher?.name || '教师'} 的课堂反馈已撤销${feedback.classLesson?.group?.name ? `（${feedback.classLesson.group.name}）` : ''}${reason ? `：${reason}` : ''}`,
        entityType: 'ClassroomFeedback',
        entityId: feedbackId,
        metadata: { reason },
      },
    })
  })

  return NextResponse.json({ success: true, message: '反馈已撤销，家长端不再可见' })
})
