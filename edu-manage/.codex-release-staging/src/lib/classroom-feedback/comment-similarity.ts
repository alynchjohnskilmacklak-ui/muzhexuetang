export type CommentSimilarityWarning = {
  studentIdA: string
  studentIdB: string
  score: number
}

function shingles(value: string) {
  const text = value.replace(/[\s，。！？；：、,.!?;:（）()“”"']/g, '')
  const result = new Set<string>()
  for (let index = 0; index < text.length - 2; index += 1) result.add(text.slice(index, index + 3))
  return result
}

export function textSimilarity(first: string, second: string) {
  const a = shingles(first)
  const b = shingles(second)
  if (!a.size || !b.size) return 0
  let intersection = 0
  for (const value of a) if (b.has(value)) intersection += 1
  return Math.round((intersection / (a.size + b.size - intersection)) * 100) / 100
}

export function findSimilarComments(
  comments: Array<{ studentId: string; comment: string }>,
  threshold = 0.58,
): CommentSimilarityWarning[] {
  const warnings: CommentSimilarityWarning[] = []
  for (let left = 0; left < comments.length; left += 1) {
    for (let right = left + 1; right < comments.length; right += 1) {
      const score = textSimilarity(comments[left].comment, comments[right].comment)
      if (score >= threshold) warnings.push({
        studentIdA: comments[left].studentId,
        studentIdB: comments[right].studentId,
        score,
      })
    }
  }
  return warnings
}
