import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { getPrismaForDivision, getRequestPrisma, isDualDbEnabled } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Division = 'JUNIOR' | 'SENIOR'

async function findStudents(division: Division, q: string, limit: number) {
  const db = isDualDbEnabled() ? getPrismaForDivision(division) : await getRequestPrisma()
  return db.student.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      ...(q ? {
        OR: [
          { name: { contains: q } },
          { parentName: { contains: q } },
          { parentPhone: { contains: q } },
        ],
      } : {}),
    },
    select: { id: true, name: true, grade: true, division: true, parentName: true },
    orderBy: [{ grade: 'desc' }, { name: 'asc' }],
    take: limit,
  })
}

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const division = searchParams.get('division') || 'all'
  const q = (searchParams.get('q') || '').trim().slice(0, 50)
  const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit')) || 50))

  const students = division === 'all' && isDualDbEnabled()
    ? (await Promise.all([
      findStudents('JUNIOR', q, limit),
      findStudents('SENIOR', q, limit),
    ])).flat().slice(0, limit)
    : await findStudents(division === 'SENIOR' ? 'SENIOR' : 'JUNIOR', q, limit)

  return NextResponse.json({ students })
})
