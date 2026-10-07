'use client'

import { AppErrorState } from '@/components/Common/AppErrorState'

export default function AdminError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AppErrorState error={error} retry={unstable_retry} homeHref="/dashboard" homeLabel="返回管理首页" />
}
