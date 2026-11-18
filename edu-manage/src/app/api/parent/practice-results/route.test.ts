import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getRequestPrisma: vi.fn(),
  getParentChildren: vi.fn(),
  findParentChild: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/parent-children', () => ({
  getParentChildren: mocks.getParentChildren,
  findParentChild: mocks.findParentChild,
}))

import { GET, POST } from './route'
import { PUBLISHED_PRACTICE_SETS } from '@/data/published-practice-bank'
import { practiceQuestionRevision, snapshotPracticeQuestions, type PracticeAnswer } from '@/lib/practice-bank'

const submissionId = 'practice_123e4567-e89b-42d3-a456-426614174000'
const practiceSet = PUBLISHED_PRACTICE_SETS.find((set) => set.questions.length >= 2
  && set.questions.some((question) => question.difficulty?.toUpperCase() !== 'EASY'))!
const questions = practiceSet.questions
const challengeQuestions = questions.filter((question) => question.difficulty?.toUpperCase() !== 'EASY')

function makeAnswers(wrongIndexes: number[] = [0], selectedQuestions = questions) {
  return Object.fromEntries(selectedQuestions.map((question, index): [string, PracticeAnswer] => {
    const wrong = wrongIndexes.includes(index)
    const type = question.type || 'single_choice'
    if (type === 'single_choice') {
      const options = question.options ?? []
      const answerIndex = question.answerIndex ?? 0
      return [question.id, wrong ? (answerIndex + 1) % options.length : answerIndex]
    }
    if (type === 'multiple_choice') {
      const answerIndices = question.answerIndices ?? [0, 1]
      return [question.id, wrong ? answerIndices.slice(1) : answerIndices]
    }
    if (type === 'fill_blank' && Array.isArray(question.correctAnswer)) {
      return [question.id, { values: wrong
        ? question.correctAnswer.map((answer, answerIndex) => answerIndex === 0 ? '__incorrect__' : answer)
        : question.correctAnswer }]
    }
    if (type === 'fill_blank' || question.gradingMode === 'exact') {
      const correctAnswer = Array.isArray(question.correctAnswer)
        ? question.correctAnswer.join('；')
        : question.correctAnswer ?? question.acceptedAnswers?.[0] ?? '正确答案'
      return [question.id, wrong ? '__incorrect__' : correctAnswer]
    }
    const response = Array.isArray(question.correctAnswer) ? question.correctAnswer.join('；') : question.correctAnswer ?? '参考答案'
    return [question.id, { response, selfRating: wrong ? 'incorrect' : 'correct' }]
  }))
}

function makeWrongIds(wrongIndexes: number[] = [0], selectedQuestions = questions) {
  return wrongIndexes.map((index) => selectedQuestions[index].id)
}

function requestBody(id = submissionId, wrongIndexes: number[] = [0]) {
  // 故意传入错误的客户端分数和错题 ID，接口必须以正式题库重新判分。
  return {
    studentId: 'student-a',
    setId: practiceSet.id,
    score: 999,
    total: 999,
    wrongIds: [],
    answers: makeAnswers(wrongIndexes),
    practiceMode: 'all',
    submissionId: id,
  }
}

function setup(prisma: unknown) {
  mocks.auth.mockResolvedValue({ user: { id: 'parent-a' } })
  mocks.getRequestPrisma.mockResolvedValue(prisma)
  mocks.getParentChildren.mockResolvedValue([{ id: 'student-a', recordIds: ['student-a'] }])
  mocks.findParentChild.mockReturnValue({ id: 'student-a', recordIds: ['student-a'] })
}

describe('parent practice attempt history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns per-attempt snapshots, the latest-result map, and all-time aggregate statistics', async () => {
    const finishedAt = new Date('2026-10-10T08:00:00.000Z')
    const prisma = {
      practiceResult: {
        findMany: vi.fn().mockResolvedValue([{
          setId: 'set-a', score: 3, total: 4, wrongIds: ['q4'], finishedAt, answers: { q1: 0 },
        }]),
      },
      practiceAttempt: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'attempt-a', setId: 'set-a', score: 2, total: 4, wrongIds: ['q2', 'q4'], finishedAt, answers: { q1: 0, q2: 1 },
          questionSnapshot: [{ id: 'q1', prompt: '题目', options: ['A', 'B'], answerIndex: 0, explanation: '解析' }],
        }]),
        aggregate: vi.fn().mockResolvedValue({ _count: { _all: 7 }, _sum: { score: 21, total: 28 } }),
      },
    }
    setup(prisma)

    const response = await GET(new Request('http://localhost/api/parent/practice-results?studentId=student-a'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(body.attemptHistoryEnabled).toBe(true)
    expect(body.results['set-a']).toMatchObject({ score: 3, total: 4, wrongIds: ['q4'] })
    expect(body.attemptStats).toEqual({ totalAttempts: 7, totalQuestions: 28, totalCorrect: 21, totalWrong: 7 })
    expect(body.attempts).toEqual([expect.objectContaining({
      id: 'attempt-a', score: 2, wrongIds: ['q2', 'q4'], answers: { q1: 0, q2: 1 },
      questionSnapshot: [{ id: 'q1', prompt: '题目', options: ['A', 'B'], answerIndex: 0, explanation: '解析' }],
    })])
    expect(prisma.practiceAttempt.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 31, skip: 0 }))
    expect(prisma.practiceAttempt.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      _count: { _all: true }, _sum: { score: true, total: true },
    }))
  })

  it('returns older attempts in bounded pages', async () => {
    const finishedAt = new Date('2026-10-10T08:00:00.000Z')
    const prisma = {
      practiceResult: { findMany: vi.fn().mockResolvedValue([]) },
      practiceAttempt: {
        findMany: vi.fn().mockResolvedValue(Array.from({ length: 31 }, (_, index) => ({
          id: `attempt-${index}`, setId: 'set-a', score: 3, total: 4, wrongIds: ['q4'], finishedAt, answers: { q1: 0 },
        }))),
        aggregate: vi.fn().mockResolvedValue({ _count: { _all: 61 }, _sum: { score: 183, total: 244 } }),
      },
    }
    setup(prisma)

    const response = await GET(new Request('http://localhost/api/parent/practice-results?studentId=student-a&page=2'))
    const body = await response.json()

    expect(body.attempts).toHaveLength(30)
    expect(body.nextPage).toBe(3)
    expect(prisma.practiceAttempt.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 30, take: 31 }))
  })

  it('recalculates the score from the published answer key and atomically saves both records', async () => {
    const attemptCreateMany = vi.fn().mockResolvedValue({ count: 1 })
    const attemptFindUnique = vi.fn()
    const resultUpsert = vi.fn().mockResolvedValue({ id: 'latest-result' })
    const tx = {
      practiceAttempt: { createMany: attemptCreateMany, findUnique: attemptFindUnique },
      practiceResult: { upsert: resultUpsert, findFirst: vi.fn().mockResolvedValue(null) },
    }
    const prisma = { $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) }
    setup(prisma)

    const response = await POST(new Request('http://localhost/api/parent/practice-results', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody()),
    }))
    const body = await response.json()
    const computedScore = questions.length - 1
    const computedWrongIds = makeWrongIds()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, duplicate: false })
    expect(attemptCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        id: submissionId, studentId: 'student-a', setId: practiceSet.id, score: computedScore,
        total: questions.length, wrongIds: computedWrongIds, answers: makeAnswers(), finishedAt: expect.any(Date),
        questionSnapshot: snapshotPracticeQuestions(questions),
      })],
      skipDuplicates: true,
    })
    expect(resultUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId_setId: { studentId: 'student-a', setId: practiceSet.id } },
      update: expect.objectContaining({ score: computedScore, total: questions.length, wrongIds: computedWrongIds }),
    }))
    expect(attemptCreateMany.mock.calls[0][0].data[0].finishedAt).toEqual(resultUpsert.mock.calls[0][0].update.finishedAt)
    expect(attemptFindUnique).toHaveBeenCalledWith({ where: { id: submissionId } })
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
    expect(body.result.id).toBe(submissionId)
  })

  it('uses the selected challenge subset as the server-side grading scope', async () => {
    const attemptCreateMany = vi.fn().mockResolvedValue({ count: 1 })
    const resultUpsert = vi.fn().mockResolvedValue({ id: 'latest-result' })
    const tx = {
      practiceAttempt: { createMany: attemptCreateMany, findUnique: vi.fn() },
      practiceResult: { upsert: resultUpsert, findFirst: vi.fn().mockResolvedValue(null) },
    }
    setup({ $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) })
    const body = {
      ...requestBody(),
      practiceMode: 'challenge',
      answers: makeAnswers([0], challengeQuestions),
    }

    const response = await POST(new Request('http://localhost/api/parent/practice-results', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }))

    expect(response.status).toBe(200)
    expect(attemptCreateMany.mock.calls[0][0].data[0]).toMatchObject({
      score: challengeQuestions.length - 1,
      total: challengeQuestions.length,
      wrongIds: makeWrongIds([0], challengeQuestions),
      answers: makeAnswers([0], challengeQuestions),
      questionSnapshot: snapshotPracticeQuestions(challengeQuestions),
    })
  })

  it('treats a retry with the same submission ID and answers as a successful no-op', async () => {
    const finishedAt = new Date('2026-10-10T08:00:00.000Z')
    const payload = requestBody()
    const existing = {
      id: submissionId,
      studentId: 'student-a',
      setId: practiceSet.id,
      score: questions.length - 1,
      total: questions.length,
      wrongIds: makeWrongIds(),
      answers: payload.answers,
      questionSnapshot: snapshotPracticeQuestions(questions),
      finishedAt,
    }
    const attemptCreateMany = vi.fn().mockResolvedValue({ count: 0 })
    const attemptFindUnique = vi.fn().mockResolvedValue(existing)
    const resultUpsert = vi.fn()
    const tx = {
      practiceAttempt: { createMany: attemptCreateMany, findUnique: attemptFindUnique },
      practiceResult: { upsert: resultUpsert },
    }
    setup({ $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) })

    const response = await POST(new Request('http://localhost/api/parent/practice-results', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, duplicate: true })
    expect(attemptFindUnique).toHaveBeenCalledWith({ where: { id: submissionId } })
    expect(resultUpsert).not.toHaveBeenCalled()
  })

  it('rejects reuse of a submission ID for different answers without changing the latest result', async () => {
    const attemptCreateMany = vi.fn().mockResolvedValue({ count: 0 })
    const attemptFindUnique = vi.fn().mockResolvedValue({
      id: submissionId, studentId: 'student-a', setId: practiceSet.id,
      score: questions.length - 1, total: questions.length, wrongIds: makeWrongIds(), answers: makeAnswers(),
      questionSnapshot: snapshotPracticeQuestions(questions),
      finishedAt: new Date('2026-10-10T08:00:00.000Z'),
    })
    const resultUpsert = vi.fn()
    const tx = {
      practiceAttempt: { createMany: attemptCreateMany, findUnique: attemptFindUnique },
      practiceResult: { upsert: resultUpsert },
    }
    setup({ $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) })

    const response = await POST(new Request('http://localhost/api/parent/practice-results', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody(submissionId, [0, 1])),
    }))

    expect(response.status).toBe(409)
    expect(resultUpsert).not.toHaveBeenCalled()
  })

  it('rejects incomplete answers rather than saving a misleading zero-score attempt', async () => {
    const tx = { practiceAttempt: { findUnique: vi.fn().mockResolvedValue(null), createMany: vi.fn() } }
    const prisma = { $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) }
    setup(prisma)

    const response = await POST(new Request('http://localhost/api/parent/practice-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody(), answers: {} }),
    }))

    expect(response.status).toBe(400)
    expect(tx.practiceAttempt.createMany).not.toHaveBeenCalled()
  })

  it('requires a valid per-session submission ID', async () => {
    const prisma = { $transaction: vi.fn() }
    setup(prisma)

    const response = await POST(new Request('http://localhost/api/parent/practice-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'student-a', setId: practiceSet.id, answers: makeAnswers() }),
    }))

    expect(response.status).toBe(400)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})

describe('practice pathway recovery and wrong-answer retries', () => {
  beforeEach(() => vi.clearAllMocks())

  function transaction(previous: unknown = null, existing: unknown = null) {
    const tx = {
      practiceAttempt: { findUnique: vi.fn().mockResolvedValue(existing), createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      practiceResult: { findFirst: vi.fn().mockResolvedValue(previous), upsert: vi.fn().mockResolvedValue({}) },
    }
    const prisma = { $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) }
    setup(prisma)
    return { tx, prisma }
  }
  const post = (body: unknown) => POST(new Request('http://localhost/api/parent/practice-results', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }))

  it('persists wrong-only practice as its own attempt and preserves other unresolved questions', async () => {
    const previousAnswers = makeAnswers([0, 1])
    const { tx } = transaction({ answers: previousAnswers, wrongIds: makeWrongIds([0, 1]) })
    const selected = [questions[0]]
    const response = await post({ ...requestBody(), practiceMode: 'wrong', questionIds: [questions[0].id],
      answers: makeAnswers([], selected), questionRevision: practiceQuestionRevision(selected) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.result).toMatchObject({ id: submissionId, total: 1, score: 1, wrongIds: [] })
    expect(tx.practiceAttempt.createMany.mock.calls[0][0].data[0]).toMatchObject({ total: 1, score: 1, questionSnapshot: snapshotPracticeQuestions(selected) })
    expect(tx.practiceResult.upsert.mock.calls[0][0].update).toMatchObject({ total: questions.length, score: questions.length - 1, wrongIds: [questions[1].id] })
  })

  it('does not allow clients to choose arbitrary easy questions under wrong-only mode', async () => {
    const { tx } = transaction({ answers: makeAnswers([1]), wrongIds: makeWrongIds([1]) })
    const response = await post({ ...requestBody(), practiceMode: 'wrong', questionIds: [questions[0].id], answers: makeAnswers([], [questions[0]]) })
    expect(response.status).toBe(409)
    expect(tx.practiceAttempt.createMany).not.toHaveBeenCalled()
    expect(tx.practiceResult.upsert).not.toHaveBeenCalled()
  })

  it('refuses to grade a not-yet-saved submission against a changed question version', async () => {
    const { tx } = transaction()
    const response = await post({ ...requestBody(), questionIds: questions.map((question) => question.id), questionRevision: 'old-version' })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'QUESTION_CHANGED' })
    expect(tx.practiceAttempt.createMany).not.toHaveBeenCalled()
  })

  it('returns an already committed receipt even after a bank deployment changes its revision', async () => {
    const existing = { ...requestBody(), id: submissionId, score: questions.length - 1, total: questions.length,
      wrongIds: makeWrongIds(), finishedAt: new Date(), questionSnapshot: snapshotPracticeQuestions(questions) }
    const { tx } = transaction(null, existing)
    const response = await post({ ...requestBody(), questionIds: questions.map((q) => q.id), questionRevision: 'old-version' })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, duplicate: true, result: { id: submissionId } })
    expect(tx.practiceAttempt.createMany).not.toHaveBeenCalled()
  })

  it('retries serialization conflicts instead of losing a concurrent progress update', async () => {
    const { prisma, tx } = transaction()
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2034' })
    const response = await post(requestBody())
    expect(response.status).toBe(200)
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
    expect(tx.practiceResult.upsert).toHaveBeenCalledTimes(1)
  })

  it('gives an actionable schema error without pretending that a record was saved', async () => {
    const { prisma } = transaction()
    prisma.$transaction.mockRejectedValue({ code: 'P2022' })
    const response = await post(requestBody())
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ code: 'SCHEMA_NOT_READY' })
  })

  it('rejects a child not belonging to the current family before querying attempt details', async () => {
    const { prisma } = transaction()
    mocks.findParentChild.mockReturnValue(null)
    const response = await post(requestBody())
    expect(response.status).toBe(403)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('checks an exact saved submission without retrieving the entire practice history', async () => {
    const attempt = { id: submissionId, studentId: 'student-a', setId: practiceSet.id, score: 1 }
    const prisma = { practiceAttempt: { findUnique: vi.fn().mockResolvedValue(attempt) } }
    setup(prisma)
    const response = await GET(new Request(`http://localhost/api/parent/practice-results?studentId=student-a&submissionId=${submissionId}`))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, result: attempt })
  })

  it('does not expose an attempt belonging to another child through the status endpoint', async () => {
    const prisma = { practiceAttempt: { findUnique: vi.fn().mockResolvedValue({ id: submissionId, studentId: 'student-b' }) } }
    setup(prisma)
    const response = await GET(new Request(`http://localhost/api/parent/practice-results?studentId=student-a&submissionId=${submissionId}`))
    expect(response.status).toBe(404)
  })
})
