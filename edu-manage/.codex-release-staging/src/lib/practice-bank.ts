export type PracticeMode = 'all' | 'challenge' | 'wrong'

export type PracticeDifficulty = { difficulty?: string | null }
export type ChoicePracticeQuestion = { id: string; options: string[]; answerIndex: number }
export type PracticeAnswer = number | number[] | string | { response: string; selfRating: 'correct' | 'incorrect' }
export type PracticeQuestionSnapshot = {
  id: string
  prompt: string
  type?: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'short_answer'
  options?: string[]
  answerIndex?: number
  answerIndices?: number[]
  correctAnswer?: string
  acceptedAnswers?: string[]
  gradingMode?: 'exact' | 'self_check'
  explanation: string
  imageUrl?: string
  answerImageUrl?: string
  imageQuestion?: boolean
}

type SnapshotSourceQuestion = PracticeQuestionSnapshot

/** Store only the published question fields needed for an immutable review. */
export function snapshotPracticeQuestions(questions: SnapshotSourceQuestion[]): PracticeQuestionSnapshot[] {
  return questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    ...(question.type ? { type: question.type } : {}),
    ...(question.options ? { options: [...question.options] } : {}),
    ...(Number.isInteger(question.answerIndex) ? { answerIndex: question.answerIndex } : {}),
    ...(question.answerIndices ? { answerIndices: [...question.answerIndices] } : {}),
    ...(question.correctAnswer !== undefined ? { correctAnswer: question.correctAnswer } : {}),
    ...(question.acceptedAnswers ? { acceptedAnswers: [...question.acceptedAnswers] } : {}),
    ...(question.gradingMode ? { gradingMode: question.gradingMode } : {}),
    explanation: question.explanation,
    ...(question.imageUrl ? { imageUrl: question.imageUrl } : {}),
    ...(question.answerImageUrl ? { answerImageUrl: question.answerImageUrl } : {}),
    ...(question.imageQuestion ? { imageQuestion: true } : {}),
  }))
}

/** A deterministic content revision shared by browser and server (not an auth token). */
export function practiceQuestionRevision(questions: SnapshotSourceQuestion[]): string {
  return `v1-${stableHash(JSON.stringify(snapshotPracticeQuestions(questions))).toString(16)}`
}

/** Merge coverage, not scores: practising a subset must not erase other wrong answers. */
export function mergePracticeProgress(
  previous: { answers: unknown } | null,
  questions: PracticeQuestionSnapshot[],
  submitted: Record<string, PracticeAnswer>,
) {
  const old = previous?.answers && typeof previous.answers === 'object' && !Array.isArray(previous.answers)
    ? previous.answers as Record<string, unknown> : {}
  const answers: Record<string, PracticeAnswer> = {}
  for (const question of questions) {
    const answer = submitted[question.id] ?? old[question.id]
    if (isValidPracticeAnswer(question, answer)) {
      answers[question.id] = answer
    }
  }
  const covered = questions.filter((question) => Object.prototype.hasOwnProperty.call(answers, question.id))
  const wrongIds = covered.filter((question) => !isPracticeAnswerCorrect(question, answers[question.id])).map((question) => question.id)
  return { answers, wrongIds, total: covered.length, score: covered.length - wrongIds.length }
}

function normalizedResponse(value: string) {
  return value.trim().replace(/\s+/g, '').toLocaleLowerCase()
}

export function isValidPracticeAnswer(question: PracticeQuestionSnapshot, answer: unknown): answer is PracticeAnswer {
  const type = question.type || 'single_choice'
  if (type === 'single_choice') {
    return Number.isInteger(answer) && typeof answer === 'number'
      && answer >= 0 && answer < (question.options?.length ?? 0)
  }
  if (type === 'multiple_choice') {
    return Array.isArray(answer) && answer.length > 0
      && answer.every((index) => Number.isInteger(index) && index >= 0 && index < (question.options?.length ?? 0))
      && new Set(answer).size === answer.length
  }
  if (type === 'fill_blank') return typeof answer === 'string' && answer.trim().length > 0 && answer.length <= 2000
  if (question.gradingMode === 'exact') return typeof answer === 'string' && answer.trim().length > 0 && answer.length <= 5000
  return Boolean(answer && typeof answer === 'object' && !Array.isArray(answer)
    && typeof (answer as { response?: unknown }).response === 'string'
    && (answer as { response: string }).response.trim().length > 0
    && (answer as { response: string }).response.length <= 5000
    && ['correct', 'incorrect'].includes((answer as { selfRating?: string }).selfRating || ''))
}

export function isPracticeAnswerCorrect(question: PracticeQuestionSnapshot, answer: unknown) {
  const type = question.type || 'single_choice'
  if (type === 'single_choice') return answer === question.answerIndex
  if (type === 'multiple_choice') {
    if (!Array.isArray(answer) || !question.answerIndices) return false
    return [...answer].sort((a, b) => a - b).join(',') === [...question.answerIndices].sort((a, b) => a - b).join(',')
  }
  if (type === 'fill_blank' || question.gradingMode === 'exact') {
    if (typeof answer !== 'string') return false
    const accepted = [question.correctAnswer, ...(question.acceptedAnswers ?? [])]
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map(normalizedResponse)
    return accepted.includes(normalizedResponse(answer))
  }
  return Boolean(answer && typeof answer === 'object' && !Array.isArray(answer)
    && (answer as { selfRating?: string }).selfRating === 'correct')
}

export function formatPracticeAnswer(question: PracticeQuestionSnapshot, answer: unknown, optionLabels = true) {
  const type = question.type || 'single_choice'
  const labelFor = (index: number) => optionLabels ? String.fromCharCode(65 + index) : question.options?.[index] || String(index + 1)
  if (type === 'single_choice') return Number.isInteger(answer) && typeof answer === 'number' ? labelFor(answer) : '未作答'
  if (type === 'multiple_choice') return Array.isArray(answer) ? answer.map((index) => labelFor(index)).join('、') : '未作答'
  if (type === 'short_answer' && question.gradingMode !== 'exact') {
    const response = answer && typeof answer === 'object' && !Array.isArray(answer) ? (answer as { response?: string }).response : ''
    return typeof response === 'string' ? response : '未作答'
  }
  return typeof answer === 'string' ? answer : '未作答'
}

/** “提升+挑战”保留中等与考试级题目；缺省难度不因标签缺失而被隐藏。 */
export function selectPracticeQuestions<T extends PracticeDifficulty>(questions: T[], mode: PracticeMode): T[] {
  if (mode === 'all' || mode === 'wrong') return questions
  return questions.filter((question) => question.difficulty?.trim().toUpperCase() !== 'EASY')
}

export function getDifficultyLabel(difficulty?: string | null) {
  switch (difficulty?.trim().toUpperCase()) {
    case 'EASY': return '基础'
    case 'MEDIUM': return '提升'
    case 'EXAM': return '挑战'
    default: return '综合'
  }
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  }
  return hash >>> 0
}

/**
 * Shuffle visible choice positions per session while keeping source indices canonical.
 * Correct answers are balanced across A-D within the selected question set; the
 * returned indices still point to the unchanged source options for persistence.
 */
export function getBalancedOptionOrders<T extends ChoicePracticeQuestion>(questions: T[], seed: string) {
  const ranked = questions
    .map((question) => ({ question, rank: stableHash(`${seed}\u001f${question.id}`) }))
    .sort((a, b) => a.rank - b.rank || (a.question.id < b.question.id ? -1 : a.question.id > b.question.id ? 1 : 0))
  const targetPositions = new Map<string, number>()
  ranked.forEach(({ question }, index) => {
    targetPositions.set(question.id, index % Math.max(1, question.options.length))
  })

  return new Map(questions.map((question) => {
    const answerIndex = question.answerIndex
    if (question.options.length < 2 || answerIndex < 0 || answerIndex >= question.options.length) {
      return [question.id, question.options.map((_, index) => index)] as const
    }
    const target = Math.min(targetPositions.get(question.id) ?? answerIndex, question.options.length - 1)
    const distractors = question.options
      .map((_, index) => index)
      .filter((index) => index !== answerIndex)
      .sort((a, b) => {
        const hashA = stableHash(`${seed}\u001f${question.id}\u001f${a}`)
        const hashB = stableHash(`${seed}\u001f${question.id}\u001f${b}`)
        return hashA - hashB || a - b
      })
    distractors.splice(target, 0, answerIndex)
    return [question.id, distractors] as const
  }))
}
