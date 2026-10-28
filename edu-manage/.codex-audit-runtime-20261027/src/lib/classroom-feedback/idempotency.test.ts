import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import {
  createFeedbackOnce,
  hashFeedbackPayload,
  parseFeedbackClientRequestId,
} from './idempotency'

function fakeTransaction(options: {
  claimCount: number
  existing?: { actorUserId: string; payloadHash: string; feedbackId: string | null } | null
  feedback?: { id: string }
}) {
  return {
    classroomFeedbackRequest: {
      createMany: vi.fn().mockResolvedValue({ count: options.claimCount }),
      findUnique: vi.fn().mockResolvedValue(options.existing ?? null),
      update: vi.fn().mockResolvedValue({}),
    },
    classroomFeedback: {
      findUnique: vi.fn().mockResolvedValue(options.feedback ?? null),
    },
  } as unknown as Prisma.TransactionClient
}

describe('feedback idempotency', () => {
  it('accepts only bounded opaque request IDs', () => {
    expect(parseFeedbackClientRequestId(undefined)).toBeNull()
    expect(parseFeedbackClientRequestId('feedback-request-123')).toBe('feedback-request-123')
    expect(parseFeedbackClientRequestId('short')).toBe(false)
    expect(parseFeedbackClientRequestId('invalid id 123')).toBe(false)
  })

  it('hashes objects independent of property order', () => {
    expect(hashFeedbackPayload({ a: 1, b: { x: 2, y: 3 } }))
      .toBe(hashFeedbackPayload({ b: { y: 3, x: 2 }, a: 1 }))
  })

  it('creates once and records the resulting feedback ID', async () => {
    const tx = fakeTransaction({ claimCount: 1 })
    const create = vi.fn().mockResolvedValue({ id: 'feedback-1' })
    const result = await createFeedbackOnce(tx, {
      clientRequestId: 'request-12345678', actorUserId: 'teacher-1', payloadHash: 'hash-1',
    }, create)

    expect(result).toEqual({ ok: true, feedback: { id: 'feedback-1' }, replayed: false })
    expect(create).toHaveBeenCalledOnce()
    expect(tx.classroomFeedbackRequest.update).toHaveBeenCalledWith({
      where: { clientRequestId: 'request-12345678' },
      data: { feedbackId: 'feedback-1' },
    })
  })

  it('returns the saved result on retry without repeating side effects', async () => {
    const tx = fakeTransaction({
      claimCount: 0,
      existing: { actorUserId: 'teacher-1', payloadHash: 'hash-1', feedbackId: 'feedback-1' },
      feedback: { id: 'feedback-1' },
    })
    const create = vi.fn()
    const result = await createFeedbackOnce(tx, {
      clientRequestId: 'request-12345678', actorUserId: 'teacher-1', payloadHash: 'hash-1',
    }, create)

    expect(result).toEqual({ ok: true, feedback: { id: 'feedback-1' }, replayed: true })
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects reuse of the same request ID for changed content or another actor', async () => {
    const tx = fakeTransaction({
      claimCount: 0,
      existing: { actorUserId: 'teacher-1', payloadHash: 'hash-1', feedbackId: 'feedback-1' },
      feedback: { id: 'feedback-1' },
    })
    const create = vi.fn()

    await expect(createFeedbackOnce(tx, {
      clientRequestId: 'request-12345678', actorUserId: 'teacher-1', payloadHash: 'changed',
    }, create)).resolves.toEqual({ ok: false, conflict: 'PAYLOAD_CHANGED' })
    await expect(createFeedbackOnce(tx, {
      clientRequestId: 'request-12345678', actorUserId: 'teacher-2', payloadHash: 'hash-1',
    }, create)).resolves.toEqual({ ok: false, conflict: 'REQUEST_ID_IN_USE' })
    expect(create).not.toHaveBeenCalled()
  })
})
