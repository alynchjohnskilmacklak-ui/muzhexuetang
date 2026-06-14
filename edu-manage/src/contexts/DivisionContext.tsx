'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

export type Division = 'JUNIOR' | 'SENIOR'

interface DivisionCtx {
  division: Division
}

const Ctx = createContext<DivisionCtx>({ division: 'JUNIOR' })

export function DivisionProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const user = session?.user as Record<string, unknown> | undefined
  const division: Division = (user?.division as string) === 'SENIOR' ? 'SENIOR' : 'JUNIOR'

  return <Ctx.Provider value={{ division }}>{children}</Ctx.Provider>
}

export const useDivision = () => useContext(Ctx)
