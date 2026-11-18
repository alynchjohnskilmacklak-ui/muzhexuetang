import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser, AuthError } from '@/lib/auth/guards'
import {
  FeedbackArchiveAccessError,
  getFeedbackArchiveDetail,
} from '@/lib/classroom-feedback/archive'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const actor = await requireAdminUser()
    const { id } = await params
    const detail = await getFeedbackArchiveDetail(actor.prisma, actor, id)
    return NextResponse.json(detail)
  } catch (error) {
    if (error instanceof AuthError || error instanceof FeedbackArchiveAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
})
