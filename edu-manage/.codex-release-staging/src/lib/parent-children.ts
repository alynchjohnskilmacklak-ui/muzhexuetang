import type { PrismaClient } from '@prisma/client'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { groupParentStudentRecords, sortParentStudentsByCurrentTerm, currentTermLabel } from '@/lib/parent-student-selection'

/** One visible child per identity, with all authorized historical record IDs. */
export async function getParentChildren(prisma: PrismaClient, parentId: string) {
  const rows = await prisma.student.findMany({
    where: parentLinkedStudentWhere(parentId),
    select: {
      id: true, name: true, grade: true, gender: true, birthYear: true, updatedAt: true,
      termMemberships: {
        select: {
          grade: true, status: true, joinedAt: true,
          term: { select: { status: true, startDate: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  const grouped = groupParentStudentRecords(rows)
  return sortParentStudentsByCurrentTerm(grouped.map(({ student }) => student)).map((student) => {
    const { recordIds } = grouped.find(({ student: item }) => item.id === student.id)!
    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
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
