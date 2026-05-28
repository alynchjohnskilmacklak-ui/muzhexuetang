'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'

export function useKickListener() {
  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let active = true

    function connect() {
      if (!active) return
      es = new EventSource('/api/auth/kick-events')

      es.onmessage = async (event) => {
        if (event.data === 'kick') {
          active = false
          es?.close()
          await signOut({ redirect: false })
          window.location.href = '/login?reason=kicked'
        }
      }

      es.onerror = () => {
        es?.close()
        if (active) {
          reconnectTimer = setTimeout(connect, 8_000)
        }
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        if (!es || es.readyState === EventSource.CLOSED) {
          connect()
        }
      } else {
        es?.close()
        es = null
      }
    }

    connect()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      es?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])
}
