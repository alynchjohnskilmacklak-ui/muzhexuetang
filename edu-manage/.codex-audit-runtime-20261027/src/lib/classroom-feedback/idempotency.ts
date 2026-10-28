import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'

export type FeedbackIdempotencyConflict = 'REQUEST_ID_IN_USE' | 'PAYLOAD_CHANGED' | 'RESULT_MISSING'

export type FeedbackIdempotencyResult<TFeedback> =
  | { ok: true; feedback: TFeedback; replayed: boolean }
  | { ok: false; conflict: FeedbackIdempotencyConflict }

export function parseFeedbackClientRequestId(value: unknown): string | null | false {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(value)) return false
  return value
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    )
  }
  return value
}

export function hashFeedbackPayload(value: unknown) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value)) ?? 'null').digest('hex')
}

/**
 * Claims a teacher submission key and creates the feedback and its side effects
 * in the same transaction. A retried request returns the original row without
 * repeating notifications, badges, or audit records.
 */
export async function createFeedbackOnce<TFeedback extends { id: string }>(
  tx: Prisma.TransactionClient,
  input: {
    clientRequestId: string | null
    actorUserId: string
    payloadHash: string
  },
  create: () => Promise<TFeedback>,
): Promise<FeedbackIdempotencyResult<TFeedback>> {
  if (!input.clientRequestId) {
    return { ok: true, feedback: await create(), replayed: false }
  }

  const claim = await tx.classroomFeedbackRequest.createMany({
    data: {
      clientRequestId: input.clientRequestId,
      actorUserId: input.actorUserId,
      payloadHash: input.payloadHash,
    },
    skipDuplicates: true,
  })

  if (claim.count === 0) {
    const existing = await tx.classroomFeedbackRequest.findUnique({
      where: { clientRequestId: input.clientRequestId },
    })
    if (!existing || existing.actorUserId !== input.actorUserId) {
      return { ok: false, conflict: 'REQUEST_ID_IN_USE' }
    }
    if (existing.payloadHash !== input.payloadHash) {
      return { ok: false, conflict: 'PAYLOAD_CHANGED' }
    }
    if (!existing.feedbackId) return { ok: false, conflict: 'RESULT_MISSING' }

    const feedback = await tx.classroomFeedback.findUnique({ where: { id: existing.feedbackId } })
    return feedback
      ? { ok: true, feedback: feedback as unknown as TFeedback, replayed: true }
      : { ok: false, conflict: 'RESULT_MISSING' }
  }

  const feedback = await create()
  await tx.classroomFeedbackRequest.update({
    where: { clientRequestId: input.clientRequestId },
    data: { feedbackId: feedback.id },
  })
  return { ok: true, feedback, replayed: false }
}
