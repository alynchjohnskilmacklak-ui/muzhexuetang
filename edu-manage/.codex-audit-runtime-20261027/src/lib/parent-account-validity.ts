import type { PrismaClient } from '@prisma/client'

export const PARENT_TERM_EXPIRED_CODE = 'PARENT_TERM_EXPIRED'
export const PARENT_TERM_EXPIRED_MESSAGE = '登录信息已过期，请联系管理员'

/** A parent account is current only when it owns an active student in the active term. */
export async function hasCurrentParentStudent(
  prisma: PrismaClient,
  parentUserId: string,
  division: 'JUNIOR' | 'SENIOR',
) {
  const activeTerm = await prisma.academicTerm.findFirst({
    where: { division, status: 'ACTIVE' },
    select: { id: true },
    orderBy: { startDate: 'desc' },
  })
  // Do not lock every parent out while an administrator is between terms.
  if (!activeTerm) return true

  const student = await prisma.student.findFirst({
    where: {
      OR: [{ parentId: parentUserId }, { parentUserId }],
      status: { notIn: ['INACTIVE', 'ARCHIVED'] },
      deletedAt: null,
      termMemberships: { some: { termId: activeTerm.id, status: 'ACTIVE' } },
    },
    select: { id: true },
  })
  return Boolean(student)
}
