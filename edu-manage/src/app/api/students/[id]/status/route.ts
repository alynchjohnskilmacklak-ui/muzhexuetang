import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { apiHandler } from '@/lib/api-handler'
import { syncStudentHourSnapshot } from '@/lib/student-hour-snapshot'

export const dynamic = 'force-dynamic'

// A non-null token marks account deactivation performed by this student
// lifecycle. Manual account deactivation clears currentSessionToken, so a
// later student reactivation cannot silently undo an administrator decision.
const AUTO_DISABLED_PARENT_SESSION_TOKEN = 'system-disabled-no-current-student'

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

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

    const parentIds = [...new Set([updated.parentId, updated.parentUserId].filter((parentId): parentId is string => Boolean(parentId)))].sort()

    if (status === 'INACTIVE') {
      await tx.enrollment.updateMany({
        where: { studentId: id, status: 'ACTIVE' },
        data: { status: 'WITHDRAWN', remainHours: 0 },
      })
      await syncStudentHourSnapshot(tx, id)
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

    // Parent credentials are shared across siblings. Serialize status changes
    // for each household, then disable only when no linked student remains
    // eligible for the current term. Lock order is stable for inconsistent
    // legacy parentId/parentUserId pairs.
    if (parentIds.length && (status === 'INACTIVE' || status === 'ACTIVE')) {
      const activeTerm = await tx.academicTerm.findFirst({
        where: { division: updated.division, status: 'ACTIVE' },
        select: { id: true },
        orderBy: { startDate: 'desc' },
      })

      for (const parentId of parentIds) {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${parentId} FOR UPDATE`
        const parentAccount = await tx.user.findFirst({
          where: { id: parentId, role: 'parent', division: updated.division },
          select: { id: true, status: true, currentSessionToken: true },
        })
        if (!parentAccount) continue

        // Match the login validity policy: when there is no active term, keep
        // existing parent accounts available rather than locking out a cohort.
        const hasCurrentStudent = !activeTerm || Boolean(await tx.student.findFirst({
          where: {
            division: updated.division,
            OR: [{ parentId }, { parentUserId: parentId }],
            status: { notIn: ['INACTIVE', 'ARCHIVED'] },
            deletedAt: null,
            termMemberships: { some: { termId: activeTerm.id, status: 'ACTIVE' } },
          },
          select: { id: true },
        }))

        if (status === 'INACTIVE' && !hasCurrentStudent && parentAccount.status === 'active') {
          await tx.user.updateMany({
            where: { id: parentId, role: 'parent', division: updated.division, status: 'active' },
            data: { status: 'disabled', currentSessionToken: AUTO_DISABLED_PARENT_SESSION_TOKEN },
          })
        } else if (
          status === 'ACTIVE'
          && hasCurrentStudent
          && parentAccount.status === 'disabled'
          && parentAccount.currentSessionToken !== null
        ) {
          // Only restore accounts disabled by student lifecycle (including old
          // versions, which left a session token in place). Manual disables
          // clear the token and remain disabled until an administrator acts.
          await tx.user.updateMany({
            where: {
              id: parentId,
              role: 'parent',
              division: updated.division,
              status: 'disabled',
              currentSessionToken: { not: null },
            },
            data: { status: 'active', currentSessionToken: null },
          })
        }
      }
    }

    return updated
  })

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
})
