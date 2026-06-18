import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getStudentProfile } from '@/lib/student-profile'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const children = await prisma.student.findMany({
    where: { OR: [{ parentId: user.id }, { parentUserId: user.id }], status: { not: 'INACTIVE' } },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })
  if (children.length === 0) return NextResponse.json({ children: [], profile: null })

  const requested = req.nextUrl.searchParams.get('studentId')
  const target = requested && children.some(c => c.id === requested) ? requested : children[0].id

  const to = new Date()
  const from = new Date(to.getTime() - 180 * 86400000)

  const profile = await getStudentProfile(prisma, target, { from, to })
  return NextResponse.json({ children, activeStudentId: target, profile })
})
