import { describe, expect, it } from 'vitest'
import { mergePracticeProgress, practiceQuestionRevision, snapshotPracticeQuestions } from './practice-bank'

describe('immutable practice question snapshots', () => {
  it('copies only the published review fields and detaches mutable option arrays', () => {
    const question = {
      id: 'q1',
      prompt: '求 x',
      options: ['1', '2'],
      answerIndex: 1,
      explanation: '移项后求解',
      imageUrl: '/api/uploads/figure.webp',
      answerImageUrl: '/api/uploads/answer.webp',
      imageQuestion: false,
      privateAdminNote: 'must not be included',
    }
    const snapshot = snapshotPracticeQuestions([question])
    question.options[0] = 'changed'

    expect(snapshot).toEqual([{
      id: 'q1',
      prompt: '求 x',
      options: ['1', '2'],
      answerIndex: 1,
      explanation: '移项后求解',
      imageUrl: '/api/uploads/figure.webp',
      answerImageUrl: '/api/uploads/answer.webp',
    }])
  })
})

describe('practice coverage and revisions', () => {
  const questions = [
    { id: 'q1', prompt: '题一', options: ['1', '2'], answerIndex: 0, explanation: '解析一' },
    { id: 'q2', prompt: '题二', options: ['1', '2'], answerIndex: 1, explanation: '解析二' },
    { id: 'q3', prompt: '题三', options: ['1', '2'], answerIndex: 0, explanation: '解析三' },
  ]
  it('a subset changes only its own latest answers and preserves other pending mistakes', () => {
    const progress = mergePracticeProgress({ answers: { q1: 1, q2: 0, q3: 0 } }, questions, { q1: 0 })
    expect(progress).toEqual({ answers: { q1: 0, q2: 0, q3: 0 }, wrongIds: ['q2'], score: 2, total: 3 })
  })
  it('drops deleted question IDs and invalid options instead of reporting phantom coverage', () => {
    expect(mergePracticeProgress({ answers: { old: 0, q1: 999, q2: 0 } }, questions, { q3: 0 })).toEqual({
      answers: { q2: 0, q3: 0 }, wrongIds: ['q2'], total: 2, score: 1,
    })
  })
  it('changes the revision when content, answer key, options or selected scope changes', () => {
    const revision = practiceQuestionRevision(questions)
    expect(practiceQuestionRevision(structuredClone(questions))).toBe(revision)
    expect(practiceQuestionRevision(questions.slice(1))).not.toBe(revision)
    expect(practiceQuestionRevision([{ ...questions[0], answerIndex: 1 }, ...questions.slice(1)])).not.toBe(revision)
    expect(practiceQuestionRevision([{ ...questions[0], prompt: '新题' }, ...questions.slice(1)])).not.toBe(revision)
  })
})
