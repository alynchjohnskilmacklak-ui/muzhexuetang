'use client'

import { AppErrorState } from '@/components/Common/AppErrorState'

export default function ErrorPage({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AppErrorState error={error} retry={unstable_retry} homeHref="/" homeLabel="返回首页" />
}
