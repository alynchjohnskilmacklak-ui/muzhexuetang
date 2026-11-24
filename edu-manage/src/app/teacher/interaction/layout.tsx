import { Suspense, type ReactNode } from 'react'
import { InteractionProvider } from './_components/shell'

export const dynamic = 'force-dynamic'

export default function InteractionLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#5a4e3a', fontSize: 13 }}>正在加载课堂互动…</div>}>
      <InteractionProvider>{children}</InteractionProvider>
    </Suspense>
  )
}
