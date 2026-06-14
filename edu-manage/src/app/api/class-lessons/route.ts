import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, visibleClassGroupWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { divisionWhere } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const teacherId = searchParams.get('teacherId')
  const roomId = searchParams.get('roomId')
  const groupId = searchParams.get('groupId')
  const courseType = searchParams.get('courseType')
  const division = searchParams.get('division')

  const where: Record<string, unknown> = { status: { not: 'CANCELLED' }, ...divisionWhere(division) }
  if (startDate || endDate) {
    where.lessonDate = {
      ...(startDate ? { gte: new Date(`${startDate}T00:00:00`) } : {}),
      ...(endDate ? { lte: new Date(`${endDate}T23:59:59`) } : {}),
    }
  }
  if (groupId) where.groupId = groupId

  const groupWhere: Record<string, unknown> = { ...visibleClassGroupWhere }
  if (teacherId) {
    where.OR = [
      { teacherId },
      { group: { teacherAssignments: { some: { teacherId } } } },
    ]
  }
  if (roomId) groupWhere.roomId = roomId
  if (courseType) groupWhere.course = { ...(groupWhere.course as object), type: courseType }
  where.group = groupWhere

  const lessons = await prisma.classLesson.findMany({
    where,
    include: {
      group: {
        include: {
          course: { select: { id: true, name: true, subject: true, grade: true, type: true, color: true } },
          teacher: { select: { id: true, name: true, phone: true } },
          teacherAssignments: { include: { teacher: { select: { id: true, name: true, subjects: true } } }, orderBy: { createdAt: 'asc' } },
          room: { select: { id: true, name: true, capacity: true, type: true } },
          enrollments: { where: activeEnrollmentWhere, select: { id: true } },
        },
      },
      teacher: { select: { id: true, name: true, subjects: true } },
    },
    orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
  })

  return NextResponse.json(lessons)
})
