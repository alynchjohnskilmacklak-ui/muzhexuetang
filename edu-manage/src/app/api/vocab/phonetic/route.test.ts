import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/vocab/phonetic', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects missing word parameter with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/vocab/phonetic')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('word is required')
  })

  it('rejects invalid word format and overly long words with 400', async () => {
    const reqInvalid = new NextRequest('http://localhost:3000/api/vocab/phonetic?word=test<script>')
    const resInvalid = await GET(reqInvalid)
    expect(resInvalid.status).toBe(400)
    expect((await resInvalid.json()).error).toBe('Invalid word format')

    const longWord = 'a'.repeat(65)
    const reqLong = new NextRequest(`http://localhost:3000/api/vocab/phonetic?word=${longWord}`)
    const resLong = await GET(reqLong)
    expect(resLong.status).toBe(400)
  })

  it('fetches phonetic data and caches result', async () => {
    const mockData = {
      simple: {
        word: [{ ukphone: 'həˈləʊ', usphone: 'həˈloʊ' }],
      },
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as unknown as Response)

    const req = new NextRequest('http://localhost:3000/api/vocab/phonetic?word=hello')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ uk: '/həˈləʊ/', us: '/həˈloʊ/' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Second call should hit LRU cache without calling fetch
    const resCached = await GET(req)
    expect(resCached.status).toBe(200)
    expect(await resCached.json()).toEqual({ uk: '/həˈləʊ/', us: '/həˈloʊ/' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('falls back gracefully on network or fetch error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))
    const req = new NextRequest('http://localhost:3000/api/vocab/phonetic?word=fallbacktest')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ uk: '', us: '' })
  })
})
