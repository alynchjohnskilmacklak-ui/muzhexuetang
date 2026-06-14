import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, attendanceEligibleLessonWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { lessonId } = await params
  const records = await prisma.attendance.findMany({
    where: {
      lessonId,
      lesson: attendanceEligibleLessonWhere,
      enrollment: activeEnrollmentWhere,
      student: visibleStudentWhere,
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
