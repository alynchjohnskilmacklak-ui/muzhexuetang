import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { getRequestDivision } from '@/lib/division'
import { IntensiveReviewError, reviewIntensiveLesson } from '@/lib/intensive-review'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '仅管理员可以审核个性化课程' }, { status: 403 })
    }
    const prisma = await getRequestPrisma()
    const division = getRequestDivision(user, request.nextUrl.searchParams.get('division'))
    const { id } = await params
    const body = await request.json() as Record<string, unknown>
    const action = body.action === 'REJECT' ? 'REJECT' : body.action === 'APPROVE' ? 'APPROVE' : null
    if (!action) {
      return NextResponse.json({ error: '审核操作不正确' }, { status: 400 })
    }
    const result = await reviewIntensiveLesson({
      prisma,
      reviewId: id,
      division,
      reviewedById: user.id,
      action,
      reviewNote: typeof body.reviewNote === 'string' ? body.reviewNote : null,
    })
    revalidatePath('/schedule/intensive')
    revalidatePath('/teacher/intensive')
    revalidatePath('/teacher/attendance')
    revalidatePath('/teacher/salary')
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof IntensiveReviewError) {
      return NextResponse.json(
        { error: error.message, code: error.code, detail: error.detail },
        { status: error.status },
      )
    }
    if (
      error
      && typeof error === 'object'
      && 'code' in error
      && (error.code === 'P2034' || error.code === 'P2002')
    ) {
      return NextResponse.json(
        { error: '该授课记录正在被其他管理员处理，请刷新后重试' },
        { status: 409 },
      )
    }
    throw error
  }
})
