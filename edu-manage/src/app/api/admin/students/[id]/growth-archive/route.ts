import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser, AuthError } from '@/lib/auth/guards'
import { getStudentGrowthArchive, StudentGrowthAccessError } from '@/lib/student-growth/archive'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

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
    const includeAllHistory = searchParams.get('scope') === 'all'
    const requestedTermId = searchParams.get('termId')?.trim() || null
    const selectedTerm = includeAllHistory
      ? null
      : await resolveAdminTermScope(actor.prisma, actor.division, request)
    if (!includeAllHistory && requestedTermId && !selectedTerm) {
      return NextResponse.json({ error: '所选批次不存在或不属于当前学部' }, { status: 404 })
    }
    if (!includeAllHistory && !selectedTerm) {
      return NextResponse.json({ error: '当前没有可查看的运营批次' }, { status: 409 })
    }
    const archive = await getStudentGrowthArchive(actor.prisma, actor, id, {
      ...(selectedTerm ? { termId: selectedTerm.id } : {}),
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
