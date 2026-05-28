import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id } = await params
  const lessons = await prisma.classLesson.findMany({
    where: { groupId: id, group: visibleClassGroupWhere },
    orderBy: { lessonDate: 'asc' },
    include: {
      teacher: { select: { id: true, name: true, subjects: true } },
      attendances: {
        where: { student: visibleStudentWhere },
        include: { student: { select: { id: true, name: true } } },
      },
    },
  })
  return NextResponse.json(lessons)
})
