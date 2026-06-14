import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('groupId')
  const month = searchParams.get('month')
  const division = getRequestDivision(user, searchParams.get('division'))

  const where: Record<string, unknown> = user.role === 'admin' ? { division } : {}
  if (groupId) {
    where.lesson = { groupId, group: visibleClassGroupWhere }
  } else {
    where.lesson = { group: visibleClassGroupWhere }
  }
  if (month) {
    const [y, m] = month.split('-').map(Number)
    where.lesson = { ...(where.lesson as object || {}), lessonDate: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) } }
  }

  const lessons = await prisma.classLesson.findMany({
    where,
    include: {
      group: { select: { id: true, name: true, course: { select: { subject: true } } } },
      attendances: {
        where: { student: visibleStudentWhere },
        include: { student: { select: { id: true, name: true } } },
      },
    },
    orderBy: { lessonDate: 'desc' },
    take: 60,
  })

  const summary = lessons.map((l) => ({
    lessonId: l.id,
    date: l.lessonDate,
    startTime: l.startTime,
    groupName: l.group.name,
    subject: l.group.course.subject,
    status: l.status,
    present: l.attendances.filter((a) => a.status === 'PRESENT').length,
    leave: l.attendances.filter((a) => a.status === 'LEAVE').length,
    absent: l.attendances.filter((a) => a.status === 'ABSENT').length,
    total: l.attendances.length,
    records: l.attendances,
  }))

  return NextResponse.json(summary)
})
