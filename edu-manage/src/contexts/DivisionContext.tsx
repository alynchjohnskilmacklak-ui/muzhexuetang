'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

export type Division = 'JUNIOR' | 'SENIOR' | 'ALL'

interface DivisionCtx {
  division: Division
  setDivision: (d: Division) => void
}

const isDivision = (value: string | null | undefined): value is Division => value === 'JUNIOR' || value === 'SENIOR' || value === 'ALL'

const isWritableDivision = (d: string | null | undefined): d is 'JUNIOR' | 'SENIOR' => d === 'JUNIOR' || d === 'SENIOR'

const Ctx = createContext<DivisionCtx>({ division: 'JUNIOR', setDivision: () => {} })

export function DivisionProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [division, setDivisionState] = useState<Division>('JUNIOR')

  const userDivision = (session?.user as Record<string, unknown> | undefined)?.division as string | undefined
  const sessionSelected = (session?.user as Record<string, unknown> | undefined)?.selectedDivision as string | undefined
  const canSwitch = userDivision === 'ALL'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlDiv = params.get('division')

    if (isDivision(urlDiv)) {
      // URL division takes priority but must check permission
      if (canSwitch || urlDiv === userDivision) {
        setDivisionState(urlDiv)
      } else {
        // No permission for this division — fall back to own division
        const fallback = isWritableDivision(userDivision) ? userDivision : 'JUNIOR'
        setDivisionState(fallback as Division)
        const url = new URL(window.location.href)
        url.searchParams.set('division', fallback)
        window.history.replaceState({}, '', url.toString())
      }
    } else if (isDivision(sessionSelected)) {
      // No URL param — use session selectedDivision
      setDivisionState(sessionSelected)
    } else if (isWritableDivision(userDivision)) {
      setDivisionState(userDivision)
    }
  }, [sessionSelected, userDivision, canSwitch])

  const setDivision = (d: Division) => {
    if (!isWritableDivision(d)) return
    // Only ALL-division users can switch freely
    if (!canSwitch && d !== userDivision) return
    setDivisionState(d)
    const url = new URL(window.location.href)
    url.searchParams.set('division', d)
    window.history.replaceState({}, '', url.toString())
  }

  return <Ctx.Provider value={{ division, setDivision }}>{children}</Ctx.Provider>
}

export const useDivision = () => useContext(Ctx)
