'use client'

import { AppErrorState } from '@/components/Common/AppErrorState'

export default function TeacherError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AppErrorState error={error} retry={unstable_retry} homeHref="/teacher/dashboard" homeLabel="返回教师首页" />
}
