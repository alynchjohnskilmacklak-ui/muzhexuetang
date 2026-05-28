import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status, reason } = await req.json()

  if (!['LEAD', 'TRIAL', 'ACTIVE', 'COMPLETED', 'INACTIVE'].includes(status)) {
    return NextResponse.json({ error: '无效的状态值' }, { status: 400 })
  }

  const student = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({
      where: { id },
      data: {
        status,
        leftAt: status === 'INACTIVE' ? new Date() : undefined,
        mainTeacherId: status === 'INACTIVE' ? null : undefined,
      },
    })

    if (status === 'INACTIVE') {
      await tx.enrollment.updateMany({
        where: { studentId: id, status: 'ACTIVE' },
        data: { status: 'WITHDRAWN', remainHours: 0 },
      })
      await tx.scheduleStudent.deleteMany({ where: { studentId: id } })
      await tx.performancePost.updateMany({
        where: { studentId: id, deletedAt: null },
        data: { deletedAt: new Date(), isReadByParent: true },
      })
      await tx.examPaper.updateMany({
        where: { studentId: id, status: { not: 'DELETED' } },
        data: { status: 'DELETED', isReadByParent: true },
      })

      const feedbacks = await tx.classroomFeedback.findMany({
        where: { studentIds: { has: id } },
        select: { id: true, studentIds: true },
      })
      for (const feedback of feedbacks) {
        const studentIds = feedback.studentIds.filter((studentId) => studentId !== id)
        if (studentIds.length) {
          await tx.classroomFeedback.update({ where: { id: feedback.id }, data: { studentIds } })
        } else {
          await tx.classroomFeedback.update({ where: { id: feedback.id }, data: { status: 'ARCHIVED', studentIds: [] } })
        }
      }

      const parentIds = [updated.parentId, updated.parentUserId].filter((parentId): parentId is string => Boolean(parentId))
      if (parentIds.length) {
        await tx.notification.deleteMany({
          where: {
            userId: { in: parentIds },
            OR: [
              { title: { contains: updated.name } },
              { content: { contains: updated.name } },
              { link: { in: ['/parent/performance', '/parent/grades', '/parent/schedule'] } },
            ],
          },
        })
      }
    }

    return updated
  })

  // If student goes inactive, disable linked parent account
  if (status === 'INACTIVE' && student.parentUserId) {
    await prisma.user.update({
      where: { id: student.parentUserId },
      data: { status: 'disabled' },
    })
  }

  // If student is reactivated, reactivate linked parent account
  if (status === 'ACTIVE' && student.parentUserId) {
    await prisma.user.update({
      where: { id: student.parentUserId },
      data: { status: 'active' },
    })
  }

  const userId = (session.user as { id: string }).id
  await prisma.activityLog.create({
    data: {
      userId,
      action: '变更学员状态',
      detail: `${student.name} → ${status}${reason ? `（${reason}）` : ''}${student.parentUserId ? '，家长账号同步更新' : ''}`,
    },
  })

  revalidatePath('/dashboard')
  revalidatePath('/students')
  revalidatePath('/parent/dashboard')
  revalidatePath('/parent/schedule')
  revalidatePath('/parent/grades')
  revalidatePath('/parent/performance')
  revalidatePath('/parent/teachers')

  return NextResponse.json(student)
}
