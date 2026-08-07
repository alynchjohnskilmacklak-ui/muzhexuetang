import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser, AuthError } from '@/lib/auth/guards'
import {
  FeedbackArchiveAccessError,
  getFeedbackArchive,
} from '@/lib/classroom-feedback/archive'

export const dynamic = 'force-dynamic'

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return undefined
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  if (Number.isNaN(date.getTime())) throw new FeedbackArchiveAccessError('日期格式无效', 400)
  return date
}

export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const actor = await requireAdminUser()
    const { id: studentId } = await params
    const searchParams = request.nextUrl.searchParams
    const archive = await getFeedbackArchive(actor.prisma, actor, {
      studentId,
      page: Number(searchParams.get('page') || 1),
      pageSize: Number(searchParams.get('pageSize') || 20),
      subject: searchParams.get('subject') || undefined,
      teacherId: searchParams.get('teacherId') || undefined,
      startDate: parseDate(searchParams.get('startDate')),
      endDate: parseDate(searchParams.get('endDate'), true),
    })
    return NextResponse.json(archive)
  } catch (error) {
    if (error instanceof AuthError || error instanceof FeedbackArchiveAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
})
