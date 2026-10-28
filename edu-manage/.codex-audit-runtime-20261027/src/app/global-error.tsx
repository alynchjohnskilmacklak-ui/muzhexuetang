'use client'

import { AppErrorState } from '@/components/Common/AppErrorState'

export default function GlobalError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <html lang="zh-CN">
      <title>页面加载失败｜牧哲学堂</title>
      <body style={{ margin: 0 }}>
        <AppErrorState error={error} retry={unstable_retry} homeHref="/" homeLabel="返回首页" />
      </body>
    </html>
  )
}
