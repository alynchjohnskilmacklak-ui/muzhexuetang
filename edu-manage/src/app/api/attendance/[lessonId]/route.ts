import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, attendanceEligibleLessonWhere, visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { resolveTeacherForUser } from '@/lib/performance'

export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user, req.nextUrl.searchParams.get('division'))
  const term = user.role === 'admin'
    ? await resolveAdminTermScope(prisma, division, req)
    : await getActiveAcademicTerm(prisma, division)
  const teacher = user.role === 'teacher' ? await resolveTeacherForUser(user, prisma) : null
  if (user.role === 'teacher' && !teacher) return NextResponse.json({ error: '未绑定教师身份' }, { status: 403 })

  const { lessonId } = await params
  const groupScope: Prisma.ClassGroupWhereInput = {
    ...visibleClassGroupWhere,
    termId: term?.id || '__NO_TERM__',
    ...(teacher ? {
      OR: [
        { teacherId: teacher.id },
        { teacherAssignments: { some: { teacherId: teacher.id } } },
      ],
    } : {}),
  }
  const lessonScope: Prisma.ClassLessonWhereInput = {
    ...attendanceEligibleLessonWhere,
    group: groupScope,
  }
  const studentScope: Prisma.StudentWhereInput = {
    ...visibleStudentWhere,
    division,
    ...(user.role === 'parent' ? {
      OR: [{ parentUserId: user.id }, { parentId: user.id }],
    } : {}),
  }
  const records = await prisma.attendance.findMany({
    where: {
      lessonId,
      lesson: lessonScope,
      enrollment: activeEnrollmentWhere,
      student: studentScope,
    },
    include: {
      student: { select: { id: true, name: true } },
      enrollment: { select: { remainHours: true, usedHours: true } },
      makeupRequest: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(records)
})
