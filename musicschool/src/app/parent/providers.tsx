'use client'

import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

export function ParentProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
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
          colorBorder: 'rgba(0,0,0,.08)',
          colorBorderSecondary: 'rgba(0,0,0,.06)',
          colorText: '#1a1201',
          colorTextSecondary: '#5a4e3a',
          colorTextTertiary: '#9a8e7a',
          colorTextQuaternary: 'rgba(0,0,0,.35)',
          borderRadius: 10,
          borderRadiusLG: 12,
          borderRadiusSM: 8,
          borderRadiusXS: 6,
          fontSize: 14,
          fontFamily: 'var(--font-geist-sans)',
        },
        components: {
          Button: {
            borderRadius: 10,
            controlHeight: 38,
            paddingInline: 16,
            primaryShadow: 'none',
            primaryColor: '#ffffff',
          },
          Card: {
            borderRadiusLG: 12,
            paddingLG: 24,
            colorBgContainer: '#ffffff',
            colorBorderSecondary: 'rgba(0,0,0,.08)',
          },
          Table: {
            borderRadiusLG: 12,
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
            colorBgContainer: '#ffffff',
            colorBorder: 'rgba(0,0,0,.12)',
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
            itemSelectedBg: 'rgba(232,120,74,.08)',
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
      {children}
    </ConfigProvider>
  )
}
