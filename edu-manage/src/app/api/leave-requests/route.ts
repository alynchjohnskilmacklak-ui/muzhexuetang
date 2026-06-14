import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher, teacherStudentWhere } from '@/lib/teacher-portal'
import { getRequestDivision } from '@/lib/division'
import { getRequestPrisma } from '@/lib/prisma'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || !['admin', 'teacher'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, searchParams.get('division'))

  const role = (session.user as any).role
  const where: any = {}
  if (status) where.status = status
  let prisma
  if (role === 'teacher') {
    const result = await requireCurrentTeacher()
    prisma = result.prisma
    where.student = teacherStudentWhere(result.teacher.id)
  }
  if (role === 'admin') {
    prisma = await getRequestPrisma()
    where.student = { ...(where.student || {}), division }
  }

  const [records, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: {
        student: { select: { id: true, name: true } },
        schedule: { select: { id: true, startTime: true, title: true, course: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.leaveRequest.count({ where }),
  ])

  return NextResponse.json({ records, total })
})
