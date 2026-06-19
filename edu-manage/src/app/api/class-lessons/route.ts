import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, visibleClassGroupWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { getLocalDayRange } from '@/lib/date/local-day'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const teacherIdParam = searchParams.get('teacherId')
  const roomId = searchParams.get('roomId')
  const groupId = searchParams.get('groupId')
  const courseType = searchParams.get('courseType')
  const division = getRequestDivision(user, searchParams.get('division'))

  const where: Record<string, unknown> = { status: { not: 'CANCELLED' }, division }

  if (startDate) {
    where.lessonDate = { ...(where.lessonDate as object), gte: getLocalDayRange(startDate).start }
  }
  if (endDate) {
    where.lessonDate = { ...(where.lessonDate as object), lt: getLocalDayRange(endDate).end }
  }
  if (groupId) where.groupId = groupId

  // Role-based access: teacher sees only own lessons, parent sees only children's
  const groupWhere: Record<string, unknown> = { ...visibleClassGroupWhere }

  if (user.role === 'teacher') {
    if (!user.teacherId) return NextResponse.json({ error: '未绑定教师档案' }, { status: 403 })
    // Ignore any teacherId from query params — always use session-derived teacherId
    where.OR = [
      { teacherId: user.teacherId },
      { teacherId: null, group: { teacherAssignments: { some: { teacherId: user.teacherId } } } },
    ]
    // If frontend passed a different teacherId, reject
    if (teacherIdParam && teacherIdParam !== user.teacherId) {
      return NextResponse.json({ error: '无权查看其他教师的课程' }, { status: 403 })
    }
  } else if (user.role === 'parent') {
    const studentIds = (
      await prisma.student.findMany({
        where: { parentUserId: user.id, status: { not: 'ARCHIVED' } },
        select: { id: true },
      })
    ).map(s => s.id)
    if (!studentIds.length) return NextResponse.json([])
    where.group = {
      ...(where.group as object),
      enrollments: {
        some: {
          studentId: { in: studentIds },
          status: 'ACTIVE',
        },
      },
    }
  } else if (user.role === 'admin') {
    // Admin can filter by teacherId from query
    if (teacherIdParam) {
      where.OR = [
        { teacherId: teacherIdParam },
        { teacherId: null, group: { teacherAssignments: { some: { teacherId: teacherIdParam } } } },
      ]
    }
  } else {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  if (roomId) groupWhere.roomId = roomId
  if (courseType) groupWhere.course = { ...(groupWhere.course as object), type: courseType }
  where.group = { ...(where.group as object), ...groupWhere }

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
