import { afterEach, describe, expect, it, vi } from 'vitest'
import { SalarySubmissionError, submitSalarySettlement } from './salary-settlement-client'

const body = { teacherId: 'fixture', period: 'month', termId: 'fixture-term', expectedTotal: 100 }
afterEach(() => vi.unstubAllGlobals())
describe('visible and bounded settlement submission', () => {
  it('only confirms a valid successful server receipt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, total: 100, count: 2 })))
    expect(await submitSalarySettlement(body)).toMatchObject({ total: 100, count: 2 })
  })
  it('preserves an explicit API failure message for the confirmation dialog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: '待结算金额已变化' }, { status: 409 })))
    await expect(submitSalarySettlement(body)).rejects.toMatchObject({ message: '待结算金额已变化', outcomeUncertain: false })
  })
  it('treats a network failure as an unknown result, not permission to resubmit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fixture connection lost')))
    await expect(submitSalarySettlement(body)).rejects.toMatchObject({ outcomeUncertain: true })
  })
  it('times out a stalled request and releases its pending state', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new DOMException('fixture timeout', 'AbortError')))
    })))
    await expect(submitSalarySettlement(body, 5)).rejects.toMatchObject({ outcomeUncertain: true, message: expect.stringContaining('服务器可能仍在处理') })
  })
  it('does not pretend an empty HTTP 200 response is a confirmed settlement', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({})))
    await expect(submitSalarySettlement(body)).rejects.toBeInstanceOf(SalarySubmissionError)
  })
})
