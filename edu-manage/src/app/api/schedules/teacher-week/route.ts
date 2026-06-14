import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { searchParams } = new URL(req.url)
  const teacherId = searchParams.get('teacherId')
  const weekStart = searchParams.get('weekStart')
  const division = getRequestDivision(user, searchParams.get('division'))

  if (!teacherId || !weekStart) {
    return NextResponse.json({ error: '缺少 teacherId 或 weekStart' }, { status: 400 })
  }

  const start = new Date(`${weekStart}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59)

  const lessons = await prisma.classLesson.findMany({
    where: {
      lessonDate: { gte: start, lte: end },
      status: { not: 'CANCELLED' },
      division,
      OR: [
        { teacherId },
        { group: { teacherId } },
        { group: { teacherAssignments: { some: { teacherId } } } },
      ],
    },
    include: {
      teacher: { select: { id: true, name: true } },
      group: {
        include: {
          course: { select: { id: true, name: true, subject: true, grade: true, type: true } },
          room: { select: { id: true, name: true } },
          enrollments: { where: activeEnrollmentWhere, select: { id: true } },
          teacherAssignments: { select: { teacherId: true, subject: true } },
        },
      },
    },
    orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
  })

  return NextResponse.json({ teacherId, weekStart, lessons })
})
