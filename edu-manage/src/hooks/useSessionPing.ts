import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PING_INTERVAL = 60_000

export function useSessionPing() {
  const router = useRouter()

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>

    const ping = async () => {
      try {
        const res = await fetch('/api/auth/session-ping', { cache: 'no-store' })
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

    timer = setInterval(ping, PING_INTERVAL)
    const initial = setTimeout(ping, 15_000)

    return () => {
      clearInterval(timer)
      clearTimeout(initial)
    }
  }, [router])
}
