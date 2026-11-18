import { describe, expect, it } from 'vitest'
import { PUBLISHED_PRACTICE_SETS } from './published-practice-bank'
import { PARENT_PRACTICE_SETS } from './parent-practice-bank'
import katex from 'katex'
import { formatPracticeAnswer, getBalancedOptionOrders, isPracticeAnswerCorrect, isValidPracticeAnswer, snapshotPracticeQuestions } from '@/lib/practice-bank'

function formulas(text: string) {
  return [...text.matchAll(/\$([^$]+)\$/g)].map((match) => match[1])
}

describe('parent practice bank', () => {
  it('publishes only unique, answerable original questions', () => {
    const setIds = PUBLISHED_PRACTICE_SETS.map((set) => set.id)
    expect(new Set(setIds).size).toBe(setIds.length)
    for (const set of PUBLISHED_PRACTICE_SETS) {
      expect(set.questions.length).toBeGreaterThan(0)
      expect(set.knowledgePoints.length).toBeGreaterThan(0)
      expect(set.section.trim()).not.toBe('')
      if (set.sourceNote) expect(set.sourceNote.trim().length).toBeGreaterThan(0)
      if (set.catalogEvidence?.locator) {
        expect(set.catalogEvidence.locator.length).toBeGreaterThan(3)
        expect(set.catalogEvidence.ref).toMatch(/^[a-f0-9]{64}$|^https?:\/\//)
      }
      const pointIds = new Set(set.knowledgePoints.map((point) => point.id))
      expect(pointIds.size).toBe(set.knowledgePoints.length)
      const questionIds = set.questions.map((question) => question.id)
      expect(new Set(questionIds).size).toBe(questionIds.length)
      for (const question of set.questions) {
        const type = question.type || 'single_choice'
        expect(question.prompt.trim().length).toBeGreaterThan(0)
        if (question.difficulty !== undefined) expect(question.difficulty.trim()).toBeTruthy()
        if (type === 'single_choice') {
          expect(question.options?.length).toBeGreaterThanOrEqual(2)
          expect(Number.isInteger(question.answerIndex)).toBe(true)
          expect(question.answerIndex).toBeGreaterThanOrEqual(0)
          expect(question.answerIndex).toBeLessThan(question.options!.length)
          expect(question.options![question.answerIndex!]).toBeTruthy()
        } else if (type === 'multiple_choice') {
          expect(question.options?.length).toBeGreaterThanOrEqual(2)
          expect(question.answerIndices?.length).toBeGreaterThanOrEqual(2)
          expect(new Set(question.answerIndices).size).toBe(question.answerIndices!.length)
          expect(question.answerIndices!.every((index) => index >= 0 && index < question.options!.length)).toBe(true)
        } else if (type === 'fill_blank' || question.gradingMode === 'exact') {
          const hasCorrectAnswer = Array.isArray(question.correctAnswer)
            ? question.correctAnswer.some((answer) => answer.trim())
            : question.correctAnswer?.trim()
          expect(hasCorrectAnswer || question.acceptedAnswers?.some((answer) => answer.trim())).toBeTruthy()
        } else {
          expect(type).toBe('short_answer')
          expect(question.gradingMode).toBe('self_check')
        }
        if (question.options) {
          expect(new Set(question.options.map((option) => option.trim())).size).toBe(question.options.length)
        }
        expect(question.explanation.trim().length).toBeGreaterThan(0)
        expect(pointIds.has(question.knowledgePointId)).toBe(true)
      }
      for (const content of [
        ...set.knowledgePoints.map((point) => point.content),
        ...set.questions.flatMap((question) => [
          question.prompt,
          ...(question.options ?? []),
          ...(Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer ?? '']),
          ...(question.acceptedAnswers ?? []),
          question.explanation,
        ]),
      ]) {
        expect((content.match(/\$/g) || []).length % 2).toBe(0)
        for (const formula of formulas(content)) {
          expect(() => katex.renderToString(formula, { throwOnError: true })).not.toThrow()
        }
      }
    }
  })

  it('keeps publication aligned with the complete authored bank', () => {
    const authoredSetsById = new Map(PARENT_PRACTICE_SETS.map((set) => [set.id, set]))
    for (const publishedSet of PUBLISHED_PRACTICE_SETS) {
      expect(authoredSetsById.get(publishedSet.id)).toBe(publishedSet)
    }
    expect(PUBLISHED_PRACTICE_SETS.every((set) => set.publishable === true && set.needsReview !== true)).toBe(true)
  })

  it('grades and snapshots every answer in a multi-blank question', () => {
    const question = PUBLISHED_PRACTICE_SETS.flatMap((set) => set.questions)
      .find((candidate) => candidate.type === 'fill_blank' && Array.isArray(candidate.correctAnswer))
    expect(question).toBeDefined()
    const expectedValues = question!.correctAnswer as string[]
    const answer = { values: [...expectedValues] }

    expect(isValidPracticeAnswer(question!, answer)).toBe(true)
    expect(isPracticeAnswerCorrect(question!, answer)).toBe(true)
    expect(isPracticeAnswerCorrect(question!, { values: ['错误答案', ...expectedValues.slice(1)] })).toBe(false)
    expect(isValidPracticeAnswer(question!, { values: expectedValues.slice(1) })).toBe(false)
    expect(formatPracticeAnswer(question!, answer)).toBe(expectedValues.join('；'))
    const snapshot = snapshotPracticeQuestions([question!])[0]
    expect(snapshot.correctAnswer).toEqual(expectedValues)
    expect(snapshot.correctAnswer).not.toBe(question!.correctAnswer)
  })

  it('balances correct-answer positions per subject and gives legacy questions stable IDs', () => {
    const questionsBySubject = new Map<string, Array<(typeof PUBLISHED_PRACTICE_SETS)[number]['questions'][number] & { id: string }>>()
    for (const set of PUBLISHED_PRACTICE_SETS) {
      const questions = questionsBySubject.get(set.subject) ?? []
      for (const question of set.questions) {
        expect(question.id).not.toBe('')
        questions.push({ ...question, id: `${set.id}:${question.id}` })
      }
      questionsBySubject.set(set.subject, questions)
    }

    for (const questions of questionsBySubject.values()) {
      const choiceQuestions = questions
        .filter((question) => question.type === 'single_choice' && question.options?.length === 4 && Number.isInteger(question.answerIndex))
        .map((question) => ({ id: question.id, options: question.options!, answerIndex: question.answerIndex! }))
      if (choiceQuestions.length === 0) continue
      const displayedOptions = getBalancedOptionOrders(choiceQuestions, 'test-seed')
      const counts = [0, 0, 0, 0]
      for (const question of choiceQuestions) {
        const displayIndex = displayedOptions.get(question.id)?.indexOf(question.answerIndex) ?? -1
        expect(displayIndex).toBeGreaterThanOrEqual(0)
        counts[displayIndex] += 1
      }
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    }
    expect(PUBLISHED_PRACTICE_SETS.some((set) => set.subject === '道德与法治')).toBe(false)
  })
})
