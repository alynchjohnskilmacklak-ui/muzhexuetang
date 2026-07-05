import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const { prisma } = await requireAdminUser()
  const q = req.nextUrl.searchParams.get('q')?.trim() || ''

  if (q.length < 1) {
    return NextResponse.json({ students: [], teachers: [], groups: [] })
  }

  const [students, teachers, groups] = await Promise.all([
    prisma.student.findMany({
      where: { name: { contains: q } },
      select: { id: true, name: true, grade: true, status: true },
      take: 8,
    }),
    prisma.teacher.findMany({
      where: { name: { contains: q }, status: 'ACTIVE' },
      select: { id: true, name: true, subjects: true },
      take: 8,
    }),
    prisma.classGroup.findMany({
      where: { name: { contains: q } },
      select: { id: true, name: true },
      take: 8,
    }),
  ])

  return NextResponse.json({ students, teachers, groups })
})
