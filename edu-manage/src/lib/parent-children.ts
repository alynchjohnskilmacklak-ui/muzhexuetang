import type { PrismaClient } from '@prisma/client'
import { parentStudentHistoryWhere } from '@/lib/business-visibility'
import { groupParentStudentRecords, sortParentStudentsByCurrentTerm, currentTermLabel } from '@/lib/parent-student-selection'

/** One visible child per identity, with all authorized historical record IDs. */
export async function getParentChildren(prisma: PrismaClient, parentId: string) {
  const rows = await prisma.student.findMany({
    where: parentStudentHistoryWhere(parentId),
    select: {
      id: true, identityId: true, name: true, grade: true, gender: true, birthYear: true, updatedAt: true, membershipLevel: true, status: true,
      termMemberships: {
        select: {
          grade: true, status: true, joinedAt: true,
          term: { select: { status: true, startDate: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  // Keep inactive historical rows attached to an active identity, but don't
  // surface an identity whose every record has been deactivated.
  const visibleRows = rows.filter((student) => student.status !== 'INACTIVE')
  const grouped = groupParentStudentRecords(visibleRows)
  return sortParentStudentsByCurrentTerm(grouped.map(({ student }) => student)).map((student) => {
    const recordIds = rows.filter((record) => record.identityId === student.identityId).map((record) => record.id)
    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
      membershipLevel: student.membershipLevel,
      termName: currentTermLabel(student),
      recordIds,
    }
  })
}

export function findParentChild<T extends { id: string; recordIds: string[] }>(children: T[], requested: string | null) {
  // 严格匹配：studentId 缺失或不属于该家长时返回 null，由调用方给出明确错误；
  // 不再静默回退到第一个孩子，避免多孩子切换传错 ID 时展示错误孩子的数据。
  return children.find((child) => requested && child.recordIds.includes(requested)) || null
}

export function resolveParentChildSelection<T extends { id: string; recordIds: string[] }>(
  children: T[],
  requestedChildId: string,
  storedChildId: string,
) {
  const selectedChild = requestedChildId === 'all'
    ? null
    : findParentChild(children, requestedChildId || storedChildId)
      || (!requestedChildId ? children[0] ?? null : null)
  const invalidChild = Boolean(requestedChildId && requestedChildId !== 'all' && !selectedChild)
  const studentIds = invalidChild ? [] : requestedChildId === 'all'
    ? children.flatMap((child) => child.recordIds)
    : selectedChild?.recordIds || []

  return { selectedChild, invalidChild, studentIds }
}
