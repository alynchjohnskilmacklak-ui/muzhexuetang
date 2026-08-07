import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PING_INTERVAL = 60_000
const ACCESS_CHECK_INTERVAL = 30 * 60_000

export function useSessionPing({ initialDelay = 0 }: { initialDelay?: number } = {}) {
  const router = useRouter()

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    let lastAccessCheck = 0

    const ping = async (forceAccessCheck = false) => {
      try {
        const now = Date.now()
        const shouldRecordAccess =
          forceAccessCheck || now - lastAccessCheck >= ACCESS_CHECK_INTERVAL
        if (shouldRecordAccess) lastAccessCheck = now
        const endpoint = shouldRecordAccess
          ? '/api/auth/session-ping?recordAccess=1'
          : '/api/auth/session-ping'
        const res = await fetch(endpoint, { cache: 'no-store' })
        if (res.status === 401) {
          const data = await res.json().catch(() => ({}))
          if (data.status === 'kicked') {
            clearInterval(timer)
            router.replace('/login?reason=kicked')
          } else if (data.status === 'unauthenticated') {
            clearInterval(timer)
            router.replace('/login')
          }
        }
        if (res.status === 403) {
          clearInterval(timer)
          router.replace('/login?reason=disabled')
        }
      } catch {
        // 网络异常时静默忽略，等下次再试。
      }
    }

    let initialTimer: ReturnType<typeof setTimeout> | null = null
    timer = setInterval(() => void ping(), PING_INTERVAL)
    if (initialDelay > 0) {
      initialTimer = setTimeout(() => void ping(true), initialDelay)
    } else {
      void ping(true)
    }

    return () => {
      clearInterval(timer)
      if (initialTimer) clearTimeout(initialTimer)
    }
  }, [initialDelay, router])
}
