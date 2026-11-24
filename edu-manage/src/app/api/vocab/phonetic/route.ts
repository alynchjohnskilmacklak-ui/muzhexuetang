import { NextRequest, NextResponse } from 'next/server'

// 内存中音标缓存
const phoneticCache = new Map<string, { uk: string; us: string }>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const word = searchParams.get('word')?.trim()
  if (!word) {
    return NextResponse.json({ error: 'word is required' }, { status: 400 })
  }

  const key = word.toLowerCase()
  if (phoneticCache.has(key)) {
    return NextResponse.json(phoneticCache.get(key)!)
  }

  try {
    const res = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })
    const data = await res.json()
    const wordInfo = data.simple?.word?.[0]
    const uk = wordInfo?.ukphone ? `/${wordInfo.ukphone}/` : ''
    const us = wordInfo?.usphone ? `/${wordInfo.usphone}/` : ''
    const result = { uk: uk || us, us: us || uk }
    phoneticCache.set(key, result)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ uk: '', us: '' })
  }
}
