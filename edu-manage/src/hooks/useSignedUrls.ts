'use client'

import { useEffect, useMemo, useState } from 'react'
import { normalizeUploadUrl } from '@/lib/upload-url'

const LOADING_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%23f5f2ee'/%3E%3Ctext x='48' y='48' text-anchor='middle' dominant-baseline='middle' fill='%239a8e7a' font-size='12'%3E加载中%3C/text%3E%3C/svg%3E"

export function useSignedUrls(keys: string[] | undefined) {
  const stableKeys = useMemo(
    () => Array.isArray(keys) ? keys.filter((key): key is string => typeof key === 'string' && key.length > 0) : [],
    [keys],
  )
  const requestKey = useMemo(() => JSON.stringify(stableKeys), [stableKeys])
  const [urlMap, setUrlMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const keysForRequest = JSON.parse(requestKey) as string[]
    if (!keysForRequest.length) {
      setUrlMap({})
      setLoading(false)
      return
    }

    setLoading(true)
    fetch('/api/uploads/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: keysForRequest }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setUrlMap(data?.urls || {})
      })
      .catch(() => {
        if (!cancelled) setUrlMap({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [requestKey])

  const urls = useMemo(
    () => stableKeys.map((key) => urlMap[key] || (loading ? LOADING_IMAGE : normalizeUploadUrl(key))),
    [stableKeys, urlMap, loading],
  )

  return { urls, loading, urlMap }
}
