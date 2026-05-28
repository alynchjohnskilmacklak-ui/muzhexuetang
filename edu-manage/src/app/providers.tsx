'use client'

import { NextAuthProvider } from './NextAuthProvider'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { SWRConfig } from 'swr'
import { Toaster } from 'sonner'

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10_000,
  // 移除全局 30s 轮询，改为各页面按需设置
  // 避免所有 SWR 同时刷新导致界面卡顿
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      <AntdRegistry>
        <ConfigProvider
        getPopupContainer={() => document.getElementById('mobile-root') ?? document.body}
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#E8784A',
            colorInfo: '#E8784A',
            colorSuccess: '#1D9E75',
            colorWarning: '#f5a623',
            colorError: '#E24B4A',
            colorBgBase: '#faf8f5',
            colorBgContainer: '#ffffff',
            colorBgElevated: '#ffffff',
            colorBgLayout: '#faf8f5',
            colorBorder: 'rgba(0,0,0,.06)',
            colorBorderSecondary: 'rgba(0,0,0,.04)',
            colorText: '#1a1201',
            colorTextSecondary: '#5a4e3a',
            colorTextTertiary: '#9a8e7a',
            colorTextQuaternary: 'rgba(0,0,0,.35)',
            borderRadius: 10,
            borderRadiusLG: 14,
            borderRadiusSM: 8,
            borderRadiusXS: 6,
            fontSize: 14,
            fontFamily: 'var(--font-geist-sans)',
            fontFamilyCode: 'var(--font-geist-mono)',
            lineHeight: 1.5,
            wireframe: false,
          },
          components: {
            Button: {
              borderRadius: 10,
              controlHeight: 38,
              paddingInline: 16,
              primaryShadow: '0 4px 14px rgba(232,120,74,.3)',
              primaryColor: '#ffffff',
              defaultBg: '#ffffff',
              defaultBorderColor: 'rgba(0,0,0,.12)',
              defaultColor: '#1a1201',
            },
            Card: {
              borderRadiusLG: 14,
              paddingLG: 24,
              colorBgContainer: '#ffffff',
              colorBorderSecondary: 'rgba(0,0,0,.06)',
            },
            Table: {
              borderRadiusLG: 14,
              colorBgContainer: '#ffffff',
              headerBg: '#faf8f5',
              headerColor: '#5a4e3a',
              rowHoverBg: 'rgba(232,120,74,.04)',
              borderColor: 'rgba(0,0,0,.06)',
            },
            Input: {
              borderRadius: 10,
              paddingInline: 12,
              controlHeight: 38,
              colorBgContainer: '#fafafa',
              colorBorder: '#EFE3DC',
              hoverBorderColor: 'rgba(232,120,74,.5)',
              activeBorderColor: '#E8784A',
            },
            Select: {
              borderRadius: 10,
              controlHeight: 38,
              colorBgContainer: '#ffffff',
              colorBorder: 'rgba(0,0,0,.12)',
              optionSelectedBg: 'rgba(232,120,74,.08)',
            },
            Layout: {
              siderBg: '#faf8f5',
              headerBg: '#ffffff',
              bodyBg: '#faf8f5',
            },
            Menu: {
              itemSelectedBg: 'rgba(232,120,74,.1)',
              itemSelectedColor: '#E8784A',
              itemHoverBg: 'rgba(232,120,74,.04)',
            },
            Tag: {
              borderRadiusSM: 9999,
            },
            Modal: {
              contentBg: '#ffffff',
              headerBg: '#ffffff',
            },
          },
        }}
      >
        <NextAuthProvider>{children}</NextAuthProvider>
        <Toaster position="top-right" richColors />
      </ConfigProvider>
    </AntdRegistry>
    </SWRConfig>
  )
}
