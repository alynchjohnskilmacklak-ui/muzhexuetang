'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { useEffect, useState } from 'react'

function usePageVisible() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const handle = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [])
  return visible
}

/**
 * SWR wrapper that pauses refreshInterval polling when the page is hidden.
 * Use for frequently-polled data (messages, unread counts) to reduce server load.
 */
export function usePausableSWR<Data = unknown, Error = unknown>(
  key: string | null,
  fetcher: (url: string) => Promise<Data>,
  config?: SWRConfiguration<Data, Error>,
) {
  const visible = usePageVisible()
  const refreshInterval = config?.refreshInterval ?? 0

  const effectiveConfig: SWRConfiguration<Data, Error> = {
    ...config,
    refreshInterval: visible ? refreshInterval : 0,
  }

  return useSWR<Data, Error>(key, fetcher, effectiveConfig)
}
