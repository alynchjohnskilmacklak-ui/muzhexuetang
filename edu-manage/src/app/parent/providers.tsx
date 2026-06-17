'use client'

import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { ANTD_THEME } from '@/constants/theme'

export function ParentProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      getPopupContainer={() => document.getElementById('mobile-root') ?? document.body}
      locale={zhCN}
      theme={ANTD_THEME}
    >
      {children}
    </ConfigProvider>
  )
}
