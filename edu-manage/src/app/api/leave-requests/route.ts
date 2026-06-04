import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher, teacherStudentWhere } from '@/lib/teacher-portal'

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

  const role = (session.user as any).role
  const where: any = {}
  if (status) where.status = status
  if (role === 'teacher') {
    const { teacher } = await requireCurrentTeacher()
    where.student = teacherStudentWhere(teacher.id)
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
