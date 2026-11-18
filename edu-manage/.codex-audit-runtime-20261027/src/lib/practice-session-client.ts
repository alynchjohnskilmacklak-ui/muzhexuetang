'use client'

import { isPracticeAnswerCorrect, isValidPracticeAnswer, practiceQuestionRevision, type PracticeAnswer, type PracticeMode, type PracticeQuestionSnapshot } from '@/lib/practice-bank'

export type PracticeSubmission = {
  studentId: string
  setId: string
  answers: Record<string, PracticeAnswer>
  practiceMode: PracticeMode
  submissionId: string
  questionIds: string[]
  questionRevision: string
}

export type PracticeReceipt = {
  id: string
  studentId: string
  setId: string
  score: number
  total: number
  wrongIds: string[]
  answers: Record<string, PracticeAnswer>
  finishedAt: string
  questionSnapshot: PracticeQuestionSnapshot[]
}

export type PracticeDraft = PracticeSubmission & { currentIndex: number; locked: boolean; savedAt: number }
export const PRACTICE_DRAFT_PREFIX = 'parent-practice-draft:'

export function practiceDraftKey(userId: string, childId: string, setId: string) {
  return `${PRACTICE_DRAFT_PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(childId)}:${encodeURIComponent(setId)}`
}

export function readPracticeDraft(storage: Pick<Storage, 'getItem' | 'removeItem'>, key: string): PracticeDraft | null {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const draft = JSON.parse(raw) as PracticeDraft
    if (!draft || typeof draft.savedAt !== 'number' || Date.now() - draft.savedAt > 7 * 86400000
      || !isPracticeSubmissionId(draft.submissionId)
      || !['all', 'challenge', 'wrong'].includes(draft.practiceMode)
      || !Array.isArray(draft.questionIds) || !draft.questionIds.length
      || new Set(draft.questionIds).size !== draft.questionIds.length
      || draft.questionIds.some((id) => typeof id !== 'string')
      || typeof draft.questionRevision !== 'string'
      || !draft.answers || typeof draft.answers !== 'object' || Array.isArray(draft.answers)
      || Object.entries(draft.answers).some(([id, answer]) => !draft.questionIds.includes(id) || !isSerializedPracticeAnswer(answer))
      || !Number.isInteger(draft.currentIndex) || draft.currentIndex < 0 || draft.currentIndex >= draft.questionIds.length
      || typeof draft.locked !== 'boolean') {
      storage.removeItem(key)
      return null
    }
    return draft
  } catch { return null }
}

export function isPracticeSubmissionId(value: unknown): value is string {
  return typeof value === 'string' && /^practice_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isSerializedPracticeAnswer(value: unknown): value is PracticeAnswer {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0
  if (typeof value === 'string') return value.length <= 5000
  if (Array.isArray(value)) return value.length > 0 && value.length <= 100
    && value.every((item) => Number.isInteger(item) && item >= 0) && new Set(value).size === value.length
  if (!value || typeof value !== 'object') return false
  const answer = value as { response?: unknown; selfRating?: unknown }
  return typeof answer.response === 'string' && answer.response.length <= 5000
    && ['correct', 'incorrect'].includes(String(answer.selfRating))
}

function isReceipt(value: unknown, submission: PracticeSubmission): value is PracticeReceipt {
  if (!value || typeof value !== 'object') return false
  const receipt = value as PracticeReceipt
  return receipt.id === submission.submissionId && receipt.studentId === submission.studentId
    && receipt.setId === submission.setId
    && Number.isInteger(receipt.total) && receipt.total === submission.questionIds.length
    && Number.isInteger(receipt.score) && receipt.score >= 0 && receipt.score <= receipt.total
    && Array.isArray(receipt.wrongIds) && receipt.wrongIds.length === receipt.total - receipt.score
    && new Set(receipt.wrongIds).size === receipt.wrongIds.length
    && receipt.wrongIds.every((id) => submission.questionIds.includes(id))
    && typeof receipt.finishedAt === 'string' && Number.isFinite(Date.parse(receipt.finishedAt))
    && receipt.answers != null && typeof receipt.answers === 'object' && !Array.isArray(receipt.answers)
    && Object.keys(receipt.answers).length === submission.questionIds.length
    && submission.questionIds.every((id) => JSON.stringify(receipt.answers[id]) === JSON.stringify(submission.answers[id]))
    && Array.isArray(receipt.questionSnapshot) && receipt.questionSnapshot.length === receipt.total
    && receipt.questionSnapshot.every((q, index) => q && typeof q === 'object' && q.id === submission.questionIds[index]
      && (q.options === undefined || (Array.isArray(q.options) && q.options.every((option) => typeof option === 'string')))
      && (q.answerIndex === undefined || (Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < (q.options?.length ?? 0)))
      && typeof q.prompt === 'string' && typeof q.explanation === 'string')
    && practiceQuestionRevision(receipt.questionSnapshot) === submission.questionRevision
    && receipt.questionSnapshot.every((q) => isValidPracticeAnswer(q, receipt.answers[q.id]))
    && receipt.questionSnapshot.filter((q) => !isPracticeAnswerCorrect(q, receipt.answers[q.id])).length === receipt.wrongIds.length
    && receipt.questionSnapshot.every((q) => receipt.wrongIds.includes(q.id) === !isPracticeAnswerCorrect(q, receipt.answers[q.id]))
}

export class PracticeSaveError extends Error {
  constructor(message: string, public readonly code = 'UNKNOWN') { super(message) }
}

/** Verify a durable receipt, not merely HTTP 200. The same ID is reused for recovery. */
export async function savePracticeSubmission(submission: PracticeSubmission, timeoutMs = 20000): Promise<PracticeReceipt> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch('/api/parent/practice-results', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission), signal: controller.signal,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new PracticeSaveError(
      typeof payload?.error === 'string' ? payload.error : `暂时无法保存（HTTP ${response.status}），请保留作答后重试`,
      payload?.code || `HTTP_${response.status}`,
    )
    if (payload?.success !== true || !isReceipt(payload.result, submission)) {
      throw new PracticeSaveError('服务器未返回完整保存凭证，请核对本次提交状态后重试')
    }
    return payload.result
  } catch (error) {
    if (error instanceof PracticeSaveError) throw error
    // A timeout can happen AFTER the transaction committed. Check the exact ID.
    const checkController = new AbortController()
    const checkTimer = setTimeout(() => checkController.abort(), Math.min(timeoutMs, 8000))
    try {
      const params = new URLSearchParams({ studentId: submission.studentId, submissionId: submission.submissionId })
      const response = await fetch(`/api/parent/practice-results?${params}`, { signal: checkController.signal, cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (response.ok && payload?.success === true && isReceipt(payload.result, submission)) return payload.result
    } catch { /* Retain the immutable payload for a safe retry. */ }
    finally { clearTimeout(checkTimer) }
    throw new PracticeSaveError('网络中断或保存超时，尚未确认结果。作答已保留；重试会核对同一次提交，不会重复记成绩')
  } finally { clearTimeout(timer) }
}
