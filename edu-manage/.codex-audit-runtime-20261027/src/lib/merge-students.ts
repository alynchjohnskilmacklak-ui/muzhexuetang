type StudentForMerge = {
  id: string
  identityId?: string | null
  recordIds?: string[]
  currentTermRecordIds?: string[]
  currentTermId?: string | null
  name: string
  updatedAt?: Date
  termMemberships?: Array<{
    status: string
    joinedAt: Date
    term: { id?: string; status: string; startDate: Date }
  }>
  enrollments?: Array<{ id: string; group?: { id?: string; termId?: string | null } | null }>
}

type MergedStudent<T extends StudentForMerge> = T & {
  recordIds: string[]
  currentTermRecordIds: string[]
  currentTermId: string | null
  enrollments: NonNullable<T['enrollments']>
}

function latestActiveTerm(student: StudentForMerge) {
  return [...(student.termMemberships || [])]
    .filter((membership) => membership.status === 'ACTIVE' && membership.term.status === 'ACTIVE')
    .sort((a, b) => b.term.startDate.getTime() - a.term.startDate.getTime() || b.joinedAt.getTime() - a.joinedAt.getTime())[0]
}

function recordRank(student: StudentForMerge) {
  const term = latestActiveTerm(student)
  return [term ? 1 : 0, term?.term.startDate.getTime() || 0, term?.joinedAt.getTime() || 0, student.updatedAt?.getTime() || 0] as const
}

function outranks(candidate: StudentForMerge, current: StudentForMerge) {
  const next = recordRank(candidate)
  const previous = recordRank(current)
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] !== previous[index]) return next[index] > previous[index]
  }
  return false
}

/**
 * 家长端同一家长下可能存在重名学生（历史数据重复建档）。
 *
 * 合并策略：
 * - 拥有真实身份（identityId 非系统默认值）的记录按 identityId 合并——同名但不同身份视为不同孩子，不合并；
 * - identityId 为系统默认生成值（`student:{id}`，建档时未建立真实身份）时回退按姓名合并，
 *   避免同一孩子在家长端重复显示；
 * - 批次记录合并只用于识别同一个孩子；当前年级、权益和课程报名取最近的有效学期记录。
 * - recordIds 保留所有历史档案 ID，供历史反馈等跨期数据读取。
 */
export function mergeDuplicateStudents<T extends StudentForMerge>(students: T[]): MergedStudent<T>[] {
  const isDefaultIdentity = (student: StudentForMerge) =>
    !student.identityId || student.identityId === `student:${student.id}`

  const groupKey = (student: StudentForMerge) =>
    isDefaultIdentity(student) ? `name:${student.name}` : `identity:${student.identityId}`

  const byKey = new Map<string, T>()
  const rowsByKey = new Map<string, T[]>()
  for (const student of students) {
    const key = groupKey(student)
    const existing = byKey.get(key)
    if (!existing) {
      const recordIds = [...new Set([...(student.recordIds || []), student.id])]
      ;(student as unknown as { recordIds?: string[] }).recordIds = recordIds
      byKey.set(key, student)
      rowsByKey.set(key, [student])
      continue
    }

    rowsByKey.get(key)?.push(student)
    const recordIds = new Set([...(existing.recordIds || [existing.id]), ...(student.recordIds || [student.id])])
    const preferred = outranks(student, existing) ? student : existing
    ;(preferred as unknown as { recordIds?: string[] }).recordIds = [...recordIds]
    byKey.set(key, preferred)
  }
  return [...byKey.entries()].map(([key, student]) => {
    const currentTerm = latestActiveTerm(student)
    const termId = currentTerm?.term.id || null
    const sourceRows = rowsByKey.get(key) || [student]
    const enrollments = termId
      ? [...new Map(sourceRows.flatMap((row) => {
          const rowTermId = latestActiveTerm(row)?.term.id
          return (row.enrollments || [])
            .filter((enrollment) => (enrollment.group?.termId || rowTermId) === termId)
            .map((enrollment) => [enrollment.id, enrollment] as const)
        })).values()]
      : student.enrollments || []
    return {
      ...student,
      currentTermId: termId,
      currentTermRecordIds: [student.id],
      enrollments,
    } as MergedStudent<T>
  })
}
