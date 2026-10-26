import { NextRequest, NextResponse } from 'next/server'
import { generateOssSignedUrl, isOssEnabled, isStorageObjectAvailable } from '@/lib/storage'
import { requireAuthenticatedUser } from '@/lib/auth/guards'
import { resolveTeacherForUser } from '@/lib/performance'
import { canAccessFeedbackImage } from '@/lib/classroom-feedback/access'
import { extractUploadStorageKey } from '@/lib/upload-url'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const SIGNED_URL_TTL_SECONDS = 3600
const SIGNED_URL_CACHE_MS = 50 * 60 * 1000
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

function normalizeLocalUploadPath(value: string) {
  if (value.startsWith('/api/uploads/')) return value
  if (value.startsWith('/uploads/')) return `/api/uploads/${encodeURIComponent(value.slice('/uploads/'.length))}`
  return value
}

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireAuthenticatedUser()

  const body = await req.json().catch(() => ({}))
  const keys: string[] = Array.isArray(body.keys)
    ? body.keys.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 50)
    : []

  if (!keys.length) return NextResponse.json({ urls: {} })

  const prisma = user.prisma
  let teacherId = user.teacherId
  if (String(user.role).toLowerCase() === 'teacher' && !teacherId) {
    teacherId = (await resolveTeacherForUser(user, prisma))?.id || null
  }
  const keyPairs = keys.map((original) => ({ original, key: extractUploadStorageKey(original) })).filter((item) => item.key)
  const access = await canAccessFeedbackImage(
    prisma,
    { id: user.id, role: user.role, teacherId },
    keyPairs.map((item) => item.original),
  )
  const urls: Record<string, string> = {}
  const denied: string[] = []
  await Promise.all(keyPairs.map(async ({ original, key }) => {
    if (!access.get(original)?.allowed) {
      denied.push(original)
      console.warn('[uploads/sign] denied feedback image', { key, userId: user.id, role: user.role })
      return
    }
    try {
      if (!isOssEnabled()) {
        urls[original] = normalizeLocalUploadPath(original)
        return
      }

      const cached = signedUrlCache.get(key)
      if (cached && cached.expiresAt > Date.now()) {
        urls[original] = cached.url
        return
      }

      // OSS 账号不可用（如 UserDisable）或对象不存在时，跳过签名、走本地通道。
      if (!(await isStorageObjectAvailable(key))) {
        urls[original] = `/api/uploads/${encodeURIComponent(key)}`
        return
      }

      const signedUrl = await generateOssSignedUrl(key, { expireSeconds: SIGNED_URL_TTL_SECONDS })
      signedUrlCache.set(key, { url: signedUrl, expiresAt: Date.now() + SIGNED_URL_CACHE_MS })
      urls[original] = signedUrl
    } catch (error) {
      console.warn('[uploads/sign] failed to sign url', { key, error })
      // Private OSS objects cannot use their unsigned public URL. The authenticated
      // upload route provides a slower but reliable fallback instead of a 403 image.
      urls[original] = `/api/uploads/${encodeURIComponent(key)}`
    }
  }))

  return NextResponse.json({ urls, denied })
})
