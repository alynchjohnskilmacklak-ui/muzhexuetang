'use client'

import { useEffect, useMemo, useState } from 'react'
import { normalizeUploadUrl } from '@/lib/upload-url'

const LOADING_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%23f5f2ee'/%3E%3Ctext x='48' y='48' text-anchor='middle' dominant-baseline='middle' fill='%239a8e7a' font-size='12'%3E加载中%3C/text%3E%3C/svg%3E"
const SIGN_BATCH_SIZE = 50

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
    const uniqueKeys = [...new Set(keysForRequest)]
    const batches = Array.from(
      { length: Math.ceil(uniqueKeys.length / SIGN_BATCH_SIZE) },
      (_, index) => uniqueKeys.slice(index * SIGN_BATCH_SIZE, (index + 1) * SIGN_BATCH_SIZE),
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
        if (!cancelled) setUrlMap(Object.assign({}, ...maps))
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
