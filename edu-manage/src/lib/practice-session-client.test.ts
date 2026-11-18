import { afterEach, describe, expect, it, vi } from 'vitest'
import { practiceDraftKey, readPracticeDraft, savePracticeSubmission, type PracticeSubmission } from './practice-session-client'
import { practiceQuestionRevision } from './practice-bank'

const submission: PracticeSubmission = {
  studentId: 'child-a', setId: 'set-a', practiceMode: 'all', questionIds: ['q1'], questionRevision: practiceQuestionRevision([{ id: 'q1', prompt: '题目', options: ['1', '2'], answerIndex: 1, explanation: '解析' }]),
  submissionId: 'practice_123e4567-e89b-42d3-a456-426614174000', answers: { q1: 1 },
}
const receipt = {
  ...submission, id: submission.submissionId, score: 1, total: 1, wrongIds: [], finishedAt: '2026-10-12T01:00:00Z',
  questionSnapshot: [{ id: 'q1', prompt: '题目', options: ['1', '2'], answerIndex: 1, explanation: '解析' }],
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

describe('durable practice save receipt', () => {
  it('accepts only a verified receipt belonging to this exact submission', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true, result: receipt }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await savePracticeSubmission(submission)).toEqual(receipt)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(submission)
  })
  it.each([
    { success: true },
    { result: receipt },
    { success: false, result: receipt },
    { success: true, result: { ...receipt, studentId: 'child-b' } },
    { success: true, result: { ...receipt, id: 'another-attempt' } },
    { success: true, result: { ...receipt, total: 999 } },
    { success: true, result: { ...receipt, answers: { q1: 0 } } },
  ])('does not display false success for malformed/mismatched HTTP 200: %j', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(body)))
    await expect(savePracticeSubmission(submission)).rejects.toThrow('保存凭证')
  })
  it('surfaces the real server failure and keeps the stable request ID on retry', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json({ error: '数据库尚未更新', code: 'SCHEMA_NOT_READY' }, 503)))
    vi.stubGlobal('fetch', fetchMock)
    await expect(savePracticeSubmission(submission)).rejects.toMatchObject({ message: '数据库尚未更新', code: 'SCHEMA_NOT_READY' })
    await expect(savePracticeSubmission(submission)).rejects.toThrow('数据库尚未更新')
    expect(fetchMock.mock.calls.every((call) => JSON.parse(call[1].body).submissionId === submission.submissionId)).toBe(true)
  })
  it('recovers a committed result after a lost POST response by checking the same ID', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(json({ success: true, result: receipt }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await savePracticeSubmission(submission)).toEqual(receipt)
    expect(fetchMock.mock.calls[1][0]).toContain(`submissionId=${submission.submissionId}`)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('never turns an unconfirmed timeout/network error into a saved result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(savePracticeSubmission(submission)).rejects.toThrow('尚未确认结果')
  })
})

describe('practice draft isolation and recovery', () => {
  it('isolates account, child and question set', () => {
    expect(new Set([
      practiceDraftKey('parent-a', 'child-a', 'set-a'), practiceDraftKey('parent-b', 'child-a', 'set-a'),
      practiceDraftKey('parent-a', 'child-b', 'set-a'), practiceDraftKey('parent-a', 'child-a', 'set-b'),
    ]).size).toBe(4)
  })
  it('restores the same submission ID and locked answers across refresh', () => {
    const draft = { ...submission, currentIndex: 0, locked: true, savedAt: Date.now() }
    const storage = { getItem: vi.fn(() => JSON.stringify(draft)), removeItem: vi.fn() }
    expect(readPracticeDraft(storage, 'key')).toEqual(draft)
  })
  it('rejects expired or corrupt draft data without crashing the page', () => {
    const storage = { getItem: vi.fn(() => '{invalid'), removeItem: vi.fn() }
    expect(readPracticeDraft(storage, 'key')).toBeNull()
    storage.getItem.mockReturnValue(JSON.stringify({ ...submission, currentIndex: 0, locked: false, savedAt: 1 }))
    expect(readPracticeDraft(storage, 'key')).toBeNull()
    expect(storage.removeItem).toHaveBeenCalled()
  })
})
