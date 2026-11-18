import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { resolveAdminTermScope, setAdminTermScopeCookie } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const term = await resolveAdminTermScope(admin.prisma, admin.division, request)
  return NextResponse.json({ term }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const body = await request.json() as { termId?: unknown }
  const termId = typeof body.termId === 'string' ? body.termId.trim() : ''
  const term = termId ? await admin.prisma.academicTerm.findFirst({
    where: { id: termId, division: admin.division },
    select: { id: true, name: true, code: true, status: true, startDate: true, endDate: true },
  }) : null
  if (!term) return NextResponse.json({ error: '运营批次不存在或不属于当前学部' }, { status: 404 })
  return setAdminTermScopeCookie(NextResponse.json({ term }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  }), term.id)
})
