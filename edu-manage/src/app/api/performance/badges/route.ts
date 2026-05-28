import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId') || ''
  if (!studentId) return NextResponse.json({ badges: [] })

  if (user.role === 'parent') {
    const allowed = await prisma.student.findFirst({
      where: { id: studentId, OR: [{ parentId: user.id }, { parentUserId: user.id }] },
      select: { id: true },
    })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (!['admin', 'teacher'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const badges = await prisma.achievementBadge.findMany({
    where: { studentId },
    include: { teacher: { select: { name: true } } },
    orderBy: { earnedAt: 'desc' },
  })
  return NextResponse.json({ badges })
})
