import { useEffect, useState } from 'react'

export function useIsMobile(breakpoint = 768): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [breakpoint])

  return isMobile
}
