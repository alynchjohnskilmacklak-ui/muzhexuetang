'use client'

import { AppErrorState } from '@/components/Common/AppErrorState'

export default function ParentError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AppErrorState error={error} retry={unstable_retry} homeHref="/parent/dashboard" homeLabel="返回家长首页" />
}
