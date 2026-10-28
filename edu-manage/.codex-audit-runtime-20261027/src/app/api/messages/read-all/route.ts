import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const PATCH = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
  if (user.role === 'parent') {
    await prisma.parentMessageReply.updateMany({
      where: {
        isReadByParent: false,
        role: { not: 'parent' },
        message: { parentId: user.id },
      },
      data: { isReadByParent: true },
    })
  } else if (user.role === 'teacher' && user.teacherId) {
    const taughtGroups = await prisma.classGroup.findMany({
      where: { OR: [{ teacherId: user.teacherId }, { teacherAssignments: { some: { teacherId: user.teacherId } } }] },
      select: { id: true },
    })
    const enrollments = await prisma.enrollment.findMany({
      where: { groupId: { in: taughtGroups.map((group) => group.id) }, status: 'ACTIVE' },
      select: { studentId: true },
    })
    const taughtStudentIds = [...new Set(enrollments.map((enrollment) => enrollment.studentId))]
    await prisma.parentMessageReply.updateMany({
      where: {
        isReadByTeacher: false,
        role: 'parent',
        message: {
          OR: [
            { feedbackId: { not: null }, feedback: { teacherId: user.teacherId } },
            {
              feedbackId: null,
              studentId: { in: taughtStudentIds.length ? taughtStudentIds : ['__none__'] },
              OR: [{ teacherId: user.teacherId }, { teacherId: null }],
            },
          ],
        },
      },
      data: { isReadByTeacher: true },
    })
  }

  return NextResponse.json({ ok: true })
})
