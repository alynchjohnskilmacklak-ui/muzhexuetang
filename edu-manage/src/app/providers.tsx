'use client'

import { NextAuthProvider } from './NextAuthProvider'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { SWRConfig } from 'swr'
import { Toaster } from 'sonner'
import { ANTD_THEME } from '@/constants/theme'

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10_000,
  errorRetryCount: 2,
  errorRetryInterval: 5000,
  fetcher: (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error(String(res.status))
    return res.json()
  }),
  // 移除全局 30s 轮询，改为各页面按需设置
  // 避免所有 SWR 同时刷新导致界面卡顿
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      <AntdRegistry>
        <ConfigProvider
        getPopupContainer={() =>
          document.getElementById('mobile-root') ??
          document.getElementById('admin-root') ??
          document.body
        }
        locale={zhCN}
        theme={ANTD_THEME}
      >
        <NextAuthProvider>{children}</NextAuthProvider>
        <Toaster position="top-center" richColors style={{ zIndex: 10000 }} />
      </ConfigProvider>
    </AntdRegistry>
    </SWRConfig>
  )
}
