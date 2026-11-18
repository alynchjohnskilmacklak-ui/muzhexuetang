import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, fetchJson } from './fetch-json'

afterEach(() => vi.unstubAllGlobals())

describe('fetchJson', () => {
  it('returns JSON for successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"items":[]}', { status: 200 })))
    await expect(fetchJson<{ items: unknown[] }>('/api/example')).resolves.toEqual({ items: [] })
  })

  it('throws a useful error instead of returning an HTTP error payload as data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"没有权限"}', { status: 403 })))
    await expect(fetchJson('/api/example')).rejects.toMatchObject({
      name: 'ApiRequestError', status: 403, message: '没有权限',
    })
  })

  it('reports network failures as retryable request errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(fetchJson('/api/example')).rejects.toBeInstanceOf(ApiRequestError)
    await expect(fetchJson('/api/example')).rejects.toMatchObject({ status: 0, message: '网络连接失败，请检查网络后重试' })
  })
})
