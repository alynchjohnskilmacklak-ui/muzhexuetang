import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

const REVIEW_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'RESOLVED'])
type RouteContext = { params: Promise<{ id: string }> }

export const PATCH = apiHandler(async (request: NextRequest, context: RouteContext) => {
  const admin = await requireAdminUser()
  try {
    const division = getRequestDivision(admin, request.nextUrl.searchParams.get('division'))
    const { id } = await context.params
    const body = await request.json().catch(() => null) as { reviewStatus?: unknown; reviewNote?: unknown } | null
    const reviewStatus = typeof body?.reviewStatus === 'string' ? body.reviewStatus : ''
    const reviewNote = typeof body?.reviewNote === 'string' ? body.reviewNote.trim() : ''

    if (!REVIEW_STATUSES.has(reviewStatus)) {
      return NextResponse.json({ error: '跟进状态无效' }, { status: 400 })
    }
    if (reviewNote.length > 1000) {
      return NextResponse.json({ error: '跟进记录不能超过 1000 个字' }, { status: 400 })
    }
    if (reviewStatus === 'RESOLVED' && reviewNote.length < 5) {
      return NextResponse.json({ error: '标记已完成前，请至少记录 5 个字的处理结果' }, { status: 400 })
    }

    const evaluation = await admin.prisma.parentClassroomFeedbackEvaluation.findFirst({
      where: {
        id,
        feedback: { is: { deletedAt: null, teacher: { is: { division } } } },
      },
      select: { id: true },
    })
    if (!evaluation) return NextResponse.json({ error: '家长评价不存在或不属于当前学部' }, { status: 404 })

    const updated = await admin.prisma.parentClassroomFeedbackEvaluation.update({
      where: { id },
      data: {
        reviewStatus,
        reviewNote: reviewStatus === 'PENDING' ? null : reviewNote || null,
        reviewedById: reviewStatus === 'PENDING' ? null : admin.id,
        reviewedAt: reviewStatus === 'PENDING' ? null : new Date(),
      },
      select: {
        id: true,
        reviewStatus: true,
        reviewNote: true,
        reviewedAt: true,
        reviewedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      item: {
        ...updated,
        reviewedAt: updated.reviewedAt?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error('[admin:parent-feedback-reviews:PATCH]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '跟进记录暂时无法保存，请稍后重试' }, { status: 500 })
  }
})
