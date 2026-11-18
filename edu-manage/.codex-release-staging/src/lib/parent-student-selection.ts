type TermMembership = {
  grade: string | null
  status: string
  joinedAt: Date
  term: { status: string; startDate: Date; name: string }
}

type ParentStudent = {
  id: string
  name: string
  gender: string | null
  birthYear: number | null
  grade: string | null
  updatedAt: Date
  termMemberships: TermMembership[]
}

function sameIdentity(left: ParentStudent, right: ParentStudent) {
  const leftActiveTerms = left.termMemberships.filter((membership) => membership.status === 'ACTIVE' && membership.term.status === 'ACTIVE')
  const rightActiveTerms = right.termMemberships.filter((membership) => membership.status === 'ACTIVE' && membership.term.status === 'ACTIVE')
  // Two simultaneously enrolled records may be two different children with the same name.
  if (leftActiveTerms.some((first) => rightActiveTerms.some((second) => first.term.startDate.getTime() === second.term.startDate.getTime()))) return false
  return left.name.trim().toLocaleLowerCase('zh-CN') === right.name.trim().toLocaleLowerCase('zh-CN')
    && (!left.birthYear || !right.birthYear || left.birthYear === right.birthYear)
    && (!left.gender || !right.gender || left.gender === right.gender)
}

function latestMembership(student: ParentStudent) {
  return [...student.termMemberships].sort((left, right) => {
    const leftActive = left.status === 'ACTIVE' && left.term.status === 'ACTIVE' ? 1 : 0
    const rightActive = right.status === 'ACTIVE' && right.term.status === 'ACTIVE' ? 1 : 0
    return rightActive - leftActive
      || right.term.startDate.getTime() - left.term.startDate.getTime()
      || right.joinedAt.getTime() - left.joinedAt.getTime()
  })[0]
}

function rank(student: ParentStudent) {
  const membership = latestMembership(student)
  return {
    active: membership?.status === 'ACTIVE' && membership.term.status === 'ACTIVE' ? 1 : 0,
    termStart: membership?.term.startDate.getTime() || 0,
    joinedAt: membership?.joinedAt.getTime() || 0,
    updatedAt: student.updatedAt.getTime(),
  }
}

/** Keep one current record when the same parent's student was recreated across terms. */
export function selectLatestParentStudents<T extends ParentStudent>(students: T[]) {
  return groupParentStudentRecords(students).map(({ student }) => student)
}

/** Keep the record IDs together without rewriting historical student data. */
export function groupParentStudentRecords<T extends ParentStudent>(students: T[]) {
  const selected: T[] = []
  const recordIds: string[][] = []
  for (const student of students) {
    const index = selected.findIndex((item) => sameIdentity(item, student))
    const current = index >= 0 ? selected[index] : null
    if (!current) {
      selected.push(student)
      recordIds.push([student.id])
      continue
    }
    recordIds[index].push(student.id)
    const nextRank = rank(student)
    const currentRank = rank(current)
    if (
      nextRank.active > currentRank.active
      || (nextRank.active === currentRank.active && nextRank.termStart > currentRank.termStart)
      || (nextRank.active === currentRank.active && nextRank.termStart === currentRank.termStart && nextRank.joinedAt > currentRank.joinedAt)
      || (nextRank.active === currentRank.active && nextRank.termStart === currentRank.termStart && nextRank.joinedAt === currentRank.joinedAt && nextRank.updatedAt > currentRank.updatedAt)
    ) selected[index] = student
  }
  return selected.map((student, index) => {
    const membership = latestMembership(student)
    return { student: { ...student, grade: membership?.grade || student.grade }, recordIds: recordIds[index] }
  })
}

/** 当前批次优先排序：ACTIVE 会员/批次在前，再按批次开始时间、加入时间倒序。 */
export function sortParentStudentsByCurrentTerm<T extends ParentStudent>(students: T[]) {
  return [...students].sort((left, right) => {
    const rankOf = (student: ParentStudent) => {
      const membership = latestMembership(student)
      return {
        active: membership?.status === 'ACTIVE' && membership.term.status === 'ACTIVE' ? 1 : 0,
        termStart: membership?.term.startDate.getTime() || 0,
        joinedAt: membership?.joinedAt.getTime() || 0,
      }
    }
    const leftRank = rankOf(left)
    const rightRank = rankOf(right)
    return rightRank.active - leftRank.active
      || rightRank.termStart - leftRank.termStart
      || rightRank.joinedAt - leftRank.joinedAt
  })
}

/** 当前批次的展示名：优先取 ACTIVE 会员所在批次名，无批次时返回 null。 */
export function currentTermLabel(student: ParentStudent) {
  const membership = latestMembership(student)
  return membership ? membership.term.name : null
}
