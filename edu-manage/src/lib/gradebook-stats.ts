export function calculateGradeStats(scores: number[]) {
  const validScores = scores.filter(score => Number.isFinite(score) && score >= 0)
  return {
    count: validScores.length,
    average: validScores.length ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length * 10) / 10 : null,
    maximum: validScores.length ? Math.max(...validScores) : null,
    minimum: validScores.length ? Math.min(...validScores) : null,
  }
}

export function isInvalidGradeScore(value: string | undefined, fullScore: number) {
  const normalized = value?.trim()
  if (!normalized) return false
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return true
  const score = Number(normalized)
  return !Number.isFinite(score) || score < 0 || score > fullScore
}

export function countCompletedGradeEntries(studentIds: string[], scores: Record<string, string>, absent: Record<string, boolean>) {
  return studentIds.filter((studentId) => Boolean(absent[studentId]) || Boolean(scores[studentId]?.trim())).length
}
