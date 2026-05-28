import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')
  const month = searchParams.get('month') // yyyy-MM
  const groupId = searchParams.get('groupId')

  if (!month) return NextResponse.json({ error: '请指定月份' }, { status: 400 })

  const [year, mon] = month.split('-').map(Number)
  const monthStart = new Date(year, mon - 1, 1)
  const monthEnd = new Date(year, mon, 1)

  const where: Record<string, unknown> = {
    lessonDate: { gte: monthStart, lt: monthEnd },
  }
  if (studentId) where.studentId = studentId
  if (groupId) where.groupId = groupId

  const records = await prisma.attendance.findMany({
    where: {
      lesson: { lessonDate: { gte: monthStart, lt: monthEnd }, group: visibleClassGroupWhere },
      student: visibleStudentWhere,
      ...(studentId ? { studentId } : {}),
    },
    include: {
      student: { select: { id: true, name: true } },
      lesson: {
        include: { group: { select: { id: true, name: true, course: { select: { subject: true } } } } },
      },
    },
    orderBy: { lesson: { lessonDate: 'asc' } },
  })

  return NextResponse.json(records)
})
