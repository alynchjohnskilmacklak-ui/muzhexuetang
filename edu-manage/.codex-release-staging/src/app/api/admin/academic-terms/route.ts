import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { listAcademicTerms, TERM_KINDS } from '@/lib/academic-term'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const [terms, selectedTerm] = await Promise.all([
    listAcademicTerms(admin.prisma, admin.division),
    resolveAdminTermScope(admin.prisma, admin.division, request),
  ])
  return NextResponse.json({ terms, selectedTermId: selectedTerm?.id || null }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const kind = TERM_KINDS.includes(body.kind) ? body.kind : 'REGULAR'
  const startDate = typeof body.startDate === 'string' ? body.startDate : ''
  const endDate = typeof body.endDate === 'string' ? body.endDate : ''
  const code = typeof body.code === 'string' && body.code.trim()
    ? body.code.trim().toUpperCase()
    : `TERM-${startDate.replaceAll('-', '')}-${Date.now().toString(36).toUpperCase()}`
  if (!name || !DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate) || startDate > endDate) {
    return NextResponse.json({ error: '请填写有效的批次名称和日期范围' }, { status: 400 })
  }
  const term = await admin.prisma.academicTerm.create({
    data: {
      name,
      code,
      kind,
      startDate: new Date(`${startDate}T00:00:00.000Z`),
      endDate: new Date(`${endDate}T00:00:00.000Z`),
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      division: admin.division,
      createdById: admin.id,
    },
  })
  return NextResponse.json({ term }, { status: 201 })
})
