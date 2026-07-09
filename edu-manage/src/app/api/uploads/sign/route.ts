import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateOssSignedUrl, isOssEnabled } from '@/lib/storage'

export const dynamic = 'force-dynamic'

function normalizeLocalUploadPath(value: string) {
  if (value.startsWith('/api/uploads/')) return value
  if (value.startsWith('/uploads/')) return `/api/uploads/${encodeURIComponent(value.slice('/uploads/'.length))}`
  return value
}

function extractStorageKey(value: string) {
  const raw = value.trim()
  if (!raw) return ''
  if (raw.startsWith('/api/uploads/')) return decodeURIComponent(raw.slice('/api/uploads/'.length))
  if (raw.startsWith('/uploads/')) return decodeURIComponent(raw.slice('/uploads/'.length))
  try {
    const url = new URL(raw)
    return decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  } catch {
    return raw.replace(/^\/+/, '')
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const keys = Array.isArray(body.keys)
    ? body.keys.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 50)
    : []

  if (!keys.length) return NextResponse.json({ urls: {} })

  const urls: Record<string, string> = {}
  for (const original of keys) {
    const key = extractStorageKey(original)
    if (!key) continue
    try {
      urls[original] = isOssEnabled()
        ? await generateOssSignedUrl(key, { expireSeconds: 3600 })
        : normalizeLocalUploadPath(original)
    } catch (error) {
      console.warn('[uploads/sign] failed to sign url', { key, error })
      urls[original] = normalizeLocalUploadPath(original)
    }
  }

  return NextResponse.json({ urls })
}
