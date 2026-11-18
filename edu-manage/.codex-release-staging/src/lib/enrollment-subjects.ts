export function normalizeEnrollmentSubjects(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))]
}

/** Empty means legacy “all subjects”; every newly edited enrollment stores an explicit list. */
export function enrollmentIncludesSubject(subjects: string[], subject: string | null | undefined) {
  if (subjects.length === 0) return true
  return Boolean(subject && subjects.includes(subject))
}

export function validateEnrollmentSubjects(selected: string[], available: string[]) {
  const allowed = new Set(available)
  return selected.length > 0 && selected.every((subject) => allowed.has(subject))
}
