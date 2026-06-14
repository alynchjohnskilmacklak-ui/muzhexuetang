'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Division = 'JUNIOR' | 'SENIOR' | 'ALL'

interface DivisionCtx {
  division: Division
  setDivision: (d: Division) => void
}

const isDivision = (value: string | null): value is Division => value === 'JUNIOR' || value === 'SENIOR' || value === 'ALL'

const Ctx = createContext<DivisionCtx>({ division: 'JUNIOR', setDivision: () => {} })

export function DivisionProvider({ children }: { children: ReactNode }) {
  const [division, setDivisionState] = useState<Division>('JUNIOR')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const d = params.get('division')
    if (isDivision(d)) setDivisionState(d)
  }, [])

  const setDivision = (d: Division) => {
    setDivisionState(d)
    const url = new URL(window.location.href)
    url.searchParams.set('division', d)
    window.history.replaceState({}, '', url.toString())
  }

  return <Ctx.Provider value={{ division, setDivision }}>{children}</Ctx.Provider>
}

export const useDivision = () => useContext(Ctx)
