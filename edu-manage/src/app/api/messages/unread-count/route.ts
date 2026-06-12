import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ count: 0 })

  let count = 0
  if (user.role === 'parent') {
    count = await prisma.parentMessageReply.count({
      where: {
        isReadByParent: false,
        role: { not: 'parent' },
        message: { parentId: user.id },
      },
    })
  } else if (user.role === 'teacher' && user.teacherId) {
    const taughtGroups = await prisma.classGroupTeacher.findMany({
      where: { teacherId: user.teacherId },
      select: { groupId: true },
    })
    const groupIds = taughtGroups.map((g) => g.groupId)
    const enrollments = await prisma.enrollment.findMany({
      where: { groupId: { in: groupIds }, status: 'ACTIVE' },
      select: { studentId: true },
    })
    const taughtStudentIds = Array.from(new Set(enrollments.map((e) => e.studentId)))
    count = await prisma.parentMessageReply.count({
      where: {
        isReadByTeacher: false,
        role: 'parent',
        message: {
          OR: [
            { teacherId: user.teacherId },
            { teacherId: null, studentId: { in: taughtStudentIds.length > 0 ? taughtStudentIds : ['__none__'] } },
          ],
        },
      },
    })
  } else if (user.role === 'admin') {
    count = await prisma.parentMessageReply.count({
      where: {
        isReadByTeacher: false,
        role: 'parent',
      },
    })
  }

  return NextResponse.json({ count }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
  })
})
