export function normalizeEnrollmentSubjects(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))]
}

/**
 * 学科归属判定：subjects 为空 = 未报名任何学科（不再兼容放行全部学科）。
 * 历史空数据已由 scripts/backfill-enrollment-subjects.ts 按班级学科全集补全。
 */
export function enrollmentIncludesSubject(subjects: string[], subject: string | null | undefined) {
  if (subjects.length === 0) return false
  return Boolean(subject && subjects.includes(subject))
}

export function validateEnrollmentSubjects(selected: string[], available: string[]) {
  const allowed = new Set(available)
  return selected.length > 0 && selected.every((subject) => allowed.has(subject))
}
