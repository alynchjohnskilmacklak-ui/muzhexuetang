export function parentIdsForPhone(rows: Array<{ parentId: string | null; parentUserId: string | null }>) {
  return [...new Set(rows.flatMap((row) => [row.parentId, row.parentUserId]).filter((id): id is string => Boolean(id)))]
}

export function canReuseStudentRecord(
  previous: { name: string; birthYear: number | null },
  incoming: { name: string; birthYear: number | null },
) {
  return previous.name.trim() === incoming.name.trim()
    && (!previous.birthYear || !incoming.birthYear || previous.birthYear === incoming.birthYear)
}
