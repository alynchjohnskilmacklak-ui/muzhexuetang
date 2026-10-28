import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser, AuthError } from '@/lib/auth/guards'
import { getStudentGrowthArchive, StudentGrowthAccessError } from '@/lib/student-growth/archive'

export const dynamic = 'force-dynamic'

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return undefined
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  if (Number.isNaN(date.getTime())) throw new StudentGrowthAccessError('日期格式无效', 400)
  return date
}

export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const actor = await requireAdminUser()
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const archive = await getStudentGrowthArchive(actor.prisma, actor, id, {
      startDate: parseDate(searchParams.get('startDate')),
      endDate: parseDate(searchParams.get('endDate'), true),
    })
    return NextResponse.json(archive)
  } catch (error) {
    if (error instanceof AuthError || error instanceof StudentGrowthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
})
