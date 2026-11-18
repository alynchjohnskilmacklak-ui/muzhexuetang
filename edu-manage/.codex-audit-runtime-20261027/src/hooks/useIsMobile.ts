import { useEffect, useState } from 'react'

export function useIsMobile(breakpoint = 768, includeCompactLandscape = false): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const landscapeMq = includeCompactLandscape
      ? window.matchMedia('(orientation: landscape) and (max-width: 1024px) and (max-height: 600px)')
      : null
    const check = () => setIsMobile(mq.matches || Boolean(landscapeMq?.matches))
    check()
    mq.addEventListener('change', check)
    landscapeMq?.addEventListener('change', check)
    return () => {
      mq.removeEventListener('change', check)
      landscapeMq?.removeEventListener('change', check)
    }
  }, [breakpoint, includeCompactLandscape])

  return isMobile
}
