import { NextRequest, NextResponse } from 'next/server'

interface PhoneticEntry {
  uk: string
  us: string
  expiresAt: number
}

const MAX_CACHE_SIZE = 2000
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const phoneticCache = new Map<string, PhoneticEntry>()

function getCached(key: string): { uk: string; us: string } | null {
  const entry = phoneticCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    phoneticCache.delete(key)
    return null
  }
  // Re-insert to mark as recently used (LRU)
  phoneticCache.delete(key)
  phoneticCache.set(key, entry)
  return { uk: entry.uk, us: entry.us }
}

function setCached(key: string, value: { uk: string; us: string }) {
  if (phoneticCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = phoneticCache.keys().next().value
    if (oldestKey) phoneticCache.delete(oldestKey)
  }
  phoneticCache.set(key, { ...value, expiresAt: Date.now() + CACHE_TTL_MS })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const word = searchParams.get('word')?.trim()
  if (!word) {
    return NextResponse.json({ error: 'word is required' }, { status: 400 })
  }

  // 限制单词字符合法性与最大长度（防止恶意构造超长输入消耗内存）
  if (word.length > 64 || !/^[a-zA-Z\s'-]+$/.test(word)) {
    return NextResponse.json({ error: 'Invalid word format' }, { status: 400 })
  }

  const key = word.toLowerCase()
  const cached = getCached(key)
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    const res = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json({ uk: '', us: '' })
    }

    const data = await res.json()
    const wordInfo = data.simple?.word?.[0]
    const uk = wordInfo?.ukphone ? `/${wordInfo.ukphone}/` : ''
    const us = wordInfo?.usphone ? `/${wordInfo.usphone}/` : ''
    const result = { uk: uk || us, us: us || uk }
    setCached(key, result)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ uk: '', us: '' })
  }
}
