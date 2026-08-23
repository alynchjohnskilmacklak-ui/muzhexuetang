import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const admin = await requireAdminUser()
  const { prisma } = admin
  const q = req.nextUrl.searchParams.get('q')?.trim() || ''
  const division = getRequestDivision(admin, req.nextUrl.searchParams.get('division'))
  const selectedTerm = await resolveAdminTermScope(prisma, division, req)
  const termId = selectedTerm?.id || '__NO_SELECTED_TERM__'

  if (q.length < 1) {
    return NextResponse.json({ students: [], teachers: [], groups: [] })
  }

  const [students, teachers, groups] = await Promise.all([
    prisma.student.findMany({
      where: { name: { contains: q }, division, termMemberships: { some: { termId } } },
      select: { id: true, name: true, grade: true, status: true },
      take: 8,
    }),
    prisma.teacher.findMany({
      where: { name: { contains: q }, status: 'ACTIVE', division },
      select: { id: true, name: true, subjects: true },
      take: 8,
    }),
    prisma.classGroup.findMany({
      where: { name: { contains: q }, division, termId },
      select: { id: true, name: true },
      take: 8,
    }),
  ])

  return NextResponse.json({ students, teachers, groups })
})
