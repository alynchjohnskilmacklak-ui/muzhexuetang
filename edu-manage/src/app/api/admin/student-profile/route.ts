import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireRole } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { getStudentProfile } from '@/lib/student-profile'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  await requireRole(['ADMIN', 'SUPER_ADMIN'])
  const prisma = await getRequestPrisma()
  const studentId = req.nextUrl.searchParams.get('studentId') || ''
  if (!studentId) return NextResponse.json({ error: '缺少 studentId' }, { status: 400 })

  const monthsParam = Number(req.nextUrl.searchParams.get('months'))
  const months = Number.isFinite(monthsParam) ? Math.min(24, Math.max(1, Math.round(monthsParam))) : 6
  const to = new Date()
  const from = new Date(to)
  from.setMonth(from.getMonth() - months)

  const [profile, summaries] = await Promise.all([
    getStudentProfile(prisma, studentId, { from, to }),
    prisma.stageSummary.findMany({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        summary: true,
        suggestions: true,
        publishedAt: true,
        updatedAt: true,
        teacher: { select: { name: true } },
      },
    }),
  ])

  if (!profile) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  return NextResponse.json({ profile, summaries, range: { from, to, months } })
})
