'use client'

import { useEffect, useMemo, useState } from 'react'
import { protectedUploadFallback } from '@/lib/upload-url'

const LOADING_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%23f5f2ee'/%3E%3Ctext x='48' y='48' text-anchor='middle' dominant-baseline='middle' fill='%239a8e7a' font-size='12'%3E加载中%3C/text%3E%3C/svg%3E"
const SIGN_BATCH_SIZE = 50
const SIGNED_URL_CACHE_TTL = 50 * 60 * 1000

type CachedSignedUrl = { url: string; expiresAt: number }
const signedUrlCache = new Map<string, CachedSignedUrl>()

export function useSignedUrls(keys: string[] | undefined, initialUrls?: Record<string, string>) {
  const stableKeys = useMemo(
    () => Array.isArray(keys) ? keys.filter((key): key is string => typeof key === 'string' && key.length > 0) : [],
    [keys],
  )
  const requestKey = useMemo(() => JSON.stringify(stableKeys), [stableKeys])
  const [urlMap, setUrlMap] = useState<Record<string, string>>(() => initialUrls || {})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    const keysForRequest = JSON.parse(requestKey) as string[]
    if (!keysForRequest.length) {
      setUrlMap({})
      setLoading(false)
      setError(false)
      return
    }

    const uniqueKeys = [...new Set(keysForRequest)]
    const now = Date.now()
    const cachedMap: Record<string, string> = {}
    const missingKeys: string[] = []

    for (const key of uniqueKeys) {
      if (key.startsWith('blob:') || key.startsWith('data:')) {
        cachedMap[key] = key
        continue
      }
      if (refreshToken === 0 && initialUrls?.[key]) {
        cachedMap[key] = initialUrls[key]
        signedUrlCache.set(key, { url: initialUrls[key], expiresAt: now + SIGNED_URL_CACHE_TTL })
        continue
      }
      const cached = signedUrlCache.get(key)
      if (cached && cached.expiresAt > now) cachedMap[key] = cached.url
      else {
        signedUrlCache.delete(key)
        missingKeys.push(key)
      }
    }

    setUrlMap(cachedMap)
    if (!missingKeys.length) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(false)
    const batches = Array.from(
      { length: Math.ceil(missingKeys.length / SIGN_BATCH_SIZE) },
      (_, index) => missingKeys.slice(index * SIGN_BATCH_SIZE, (index + 1) * SIGN_BATCH_SIZE),
    )
    Promise.all(batches.map(async (keys) => {
      const res = await fetch('/api/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return data?.urls || {}
    }))
      .then((maps) => {
        const resolvedMap = Object.assign({}, ...maps) as Record<string, string>
        const expiresAt = Date.now() + SIGNED_URL_CACHE_TTL
        for (const [key, url] of Object.entries(resolvedMap)) {
          if (url) signedUrlCache.set(key, { url, expiresAt })
        }
        if (!cancelled) setUrlMap({ ...cachedMap, ...resolvedMap })
      })
      .catch(() => {
        if (!cancelled) {
          setUrlMap(cachedMap)
          setError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [requestKey, refreshToken, initialUrls])

  const urls = useMemo(
    () => stableKeys.map((key) => urlMap[key] || (loading ? LOADING_IMAGE : protectedUploadFallback(key))),
    [stableKeys, urlMap, loading],
  )

  const refresh = () => {
    for (const key of stableKeys) signedUrlCache.delete(key)
    setRefreshToken(value => value + 1)
  }

  return { urls, loading, error, refresh, urlMap }
}
