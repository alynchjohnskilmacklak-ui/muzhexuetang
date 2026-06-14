import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const requests = await prisma.makeupRequest.findMany({
    where: {
      status: { in: ['PENDING', 'ARRANGED'] },
      student: visibleStudentWhere,
      attendance: { lesson: { group: visibleClassGroupWhere } },
    },
    include: {
      student: { select: { id: true, name: true } },
      attendance: {
        include: {
          lesson: { include: { group: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(requests)
})
