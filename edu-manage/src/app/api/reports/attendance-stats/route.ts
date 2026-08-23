import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { resolveTeacherForUser } from '@/lib/performance'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }


  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user, req.nextUrl.searchParams.get('division'))
  const term = user.role === 'admin'
    ? await resolveAdminTermScope(prisma, division, req)
    : await getActiveAcademicTerm(prisma, division)
  const teacher = user.role === 'teacher'
    ? await resolveTeacherForUser(user, prisma)
    : null
  if (user.role === 'teacher' && !teacher) {
    return NextResponse.json({ error: '未绑定教师身份' }, { status: 403 })
  }
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lessonScope = {
    lessonDate: { gte: monthStart },
    group: {
      termId: term?.id || '__NO_TERM__',
      ...(teacher ? {
        OR: [
          { teacherId: teacher.id },
          { teacherAssignments: { some: { teacherId: teacher.id } } },
        ],
      } : {}),
    },
  }
  const makeupScope = {
    attendance: { lesson: lessonScope },
  }

  const [
    totalAttendance,
    present,
    leave,
    absent,
    makeup,
    completedMakeups,
    totalMakeups,
  ] = await Promise.all([
    prisma.attendance.count({ where: { lesson: lessonScope } }),
    prisma.attendance.count({ where: { status: 'PRESENT', lesson: lessonScope } }),
    prisma.attendance.count({ where: { status: 'LEAVE', lesson: lessonScope } }),
    prisma.attendance.count({ where: { status: 'ABSENT', lesson: lessonScope } }),
    prisma.attendance.count({ where: { status: 'MAKEUP', lesson: lessonScope } }),
    prisma.makeupRequest.count({ where: { status: 'COMPLETED', ...makeupScope } }),
    prisma.makeupRequest.count({ where: makeupScope }),
  ])

  return NextResponse.json({
    totalAttendance,
    presentRate: totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0,
    leaveRate: totalAttendance > 0 ? Math.round((leave / totalAttendance) * 100) : 0,
    absentRate: totalAttendance > 0 ? Math.round((absent / totalAttendance) * 100) : 0,
    makeupRate: totalAttendance > 0 ? Math.round((makeup / totalAttendance) * 100) : 0,
    makeupCompletionRate: totalMakeups > 0 ? Math.round((completedMakeups / totalMakeups) * 100) : 0,
    totalMakeups,
    completedMakeups,
  })
})
