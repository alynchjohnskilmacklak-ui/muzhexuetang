import { describe, expect, it, vi } from 'vitest'
import { createManualSalaryAdjustmentIdempotently } from './admin-salary-adjustment'

const input = {
  requestKey: '9d3c4a11-63f1-4d66-81d7-3cb177185a21',
  teacherId: 'teacher-1',
  termId: 'term-1',
  amount: -12.5,
  description: '[小班课] 重复记账冲回',
}

function createClient() {
  let row: Record<string, unknown> | null = null
  const queryRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    if (strings.join('').includes('WHERE "manualAdjustmentRequestKey"')) {
      return row && row.manualAdjustmentRequestKey === values[0] ? [row] : []
    }
    return []
  })
  const executeRaw = vi.fn(async (_strings: TemplateStringsArray, ...values: unknown[]) => {
    row = {
      id: values[0],
      teacherId: values[1],
      termId: values[2],
      type: 'manual_adjust',
      amount: values[3],
      description: values[4],
      manualAdjustmentRequestKey: values[5],
      deletedAt: null,
    }
    return 1
  })
  return {
    client: { $queryRaw: queryRaw as never, $executeRaw: executeRaw as never },
    queryRaw,
    executeRaw,
    setRow: (value: Record<string, unknown> | null) => { row = value },
  }
}

describe('createManualSalaryAdjustmentIdempotently', () => {
  it('creates one adjustment and replays the same row for identical requests', async () => {
    const { client, queryRaw, executeRaw } = createClient()

    const created = await createManualSalaryAdjustmentIdempotently(client as never, input)
    const replayed = await createManualSalaryAdjustmentIdempotently(client as never, input)

    expect(created.status).toBe('created')
    expect(replayed.status).toBe('replayed')
    expect(executeRaw).toHaveBeenCalledOnce()
    expect(queryRaw).toHaveBeenCalledTimes(3)
  })

  it('rejects reusing a request key for a different amount or reason', async () => {
    const { client } = createClient()
    await createManualSalaryAdjustmentIdempotently(client as never, input)

    const result = await createManualSalaryAdjustmentIdempotently(client as never, { ...input, amount: -20 })

    expect(result.status).toBe('conflict')
  })

  it('recovers a concurrent unique-key winner after an insert collision', async () => {
    const existing = {
      id: 'salary-adjustment-1',
      teacherId: input.teacherId,
      termId: input.termId,
      type: 'manual_adjust',
      amount: input.amount,
      description: input.description,
      manualAdjustmentRequestKey: input.requestKey,
      deletedAt: null,
    }
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([existing])
    const executeRaw = vi.fn().mockRejectedValue(new Error('unique key conflict'))
    const client = { $queryRaw: queryRaw, $executeRaw: executeRaw }

    await expect(createManualSalaryAdjustmentIdempotently(client as never, input)).resolves.toEqual({
      status: 'replayed',
      transaction: existing,
    })
  })
})
