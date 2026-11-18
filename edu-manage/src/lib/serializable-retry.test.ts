import { describe, expect, it, vi } from 'vitest'
import { runSerializableWithRetry } from './serializable-retry'

describe('serializable transaction retries', () => {
  it('retries a Prisma serialization conflict and returns the committed attempt', async () => {
    const run = vi.fn()
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockResolvedValueOnce('committed')

    await expect(runSerializableWithRetry(run)).resolves.toBe('committed')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('does not retry non-serialization errors', async () => {
    const error = new Error('invalid input')
    const run = vi.fn().mockRejectedValue(error)

    await expect(runSerializableWithRetry(run)).rejects.toBe(error)
    expect(run).toHaveBeenCalledTimes(1)
  })
})
