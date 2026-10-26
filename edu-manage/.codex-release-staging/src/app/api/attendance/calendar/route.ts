import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { resolveTeacherForUser } from '@/lib/performance'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')
  const month = searchParams.get('month') // yyyy-MM
  const groupId = searchParams.get('groupId')
  const division = getRequestDivision(user, searchParams.get('division'))

  if (!month) return NextResponse.json({ error: '请指定月份' }, { status: 400 })

  const [year, mon] = month.split('-').map(Number)
  const monthStart = new Date(year, mon - 1, 1)
  const monthEnd = new Date(year, mon, 1)

  const term = user.role === 'admin'
    ? await resolveAdminTermScope(prisma, division, req)
    : await getActiveAcademicTerm(prisma, division)
  const teacher = user.role === 'teacher' ? await resolveTeacherForUser(user, prisma) : null
  if (user.role === 'teacher' && !teacher) return NextResponse.json({ error: '未绑定教师身份' }, { status: 403 })

  const groupScope: Record<string, unknown> = {
    ...visibleClassGroupWhere,
    termId: term?.id || '__NO_TERM__',
  }
  if (groupId) groupScope.id = groupId
  if (teacher) {
    groupScope.OR = [
      { teacherId: teacher.id },
      { teacherAssignments: { some: { teacherId: teacher.id } } },
    ]
  }
  const studentScope: Record<string, unknown> = { ...visibleStudentWhere, division }
  if (user.role === 'parent') {
    studentScope.OR = [{ parentUserId: user.id }, { parentId: user.id }]
  }

  const records = await prisma.attendance.findMany({
    where: {
      lesson: { lessonDate: { gte: monthStart, lt: monthEnd }, group: groupScope },
      student: studentScope,
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
