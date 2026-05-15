'use client'

import { NextAuthProvider } from './NextAuthProvider'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
            fontSize: 14,
          },
        }}
      >
        <NextAuthProvider>{children}</NextAuthProvider>
      </ConfigProvider>
    </AntdRegistry>
  )
}
