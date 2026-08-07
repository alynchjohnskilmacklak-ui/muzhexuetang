'use client'

import { useEffect, useState } from 'react'
import { NextAuthProvider } from './NextAuthProvider'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider, App as AntdApp, message } from 'antd'
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
  const [toastPos, setToastPos] = useState<'top-center' | 'bottom-center'>('top-center')

  useEffect(() => {
    message.config({
      duration: 2,
      maxCount: 2,
      top: 72,
    })
  }, [])

  useEffect(() => {
    const check = () => setToastPos(window.innerWidth < 768 ? 'bottom-center' : 'top-center')
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const isMobile = () => window.innerWidth < 768
    const hasVisibleOverlay = () => {
      const overlays = document.querySelectorAll<HTMLElement>(
        '.ant-modal-wrap, .ant-drawer, .ant-select-dropdown, .ant-picker-dropdown, .ant-dropdown',
      )
      return Array.from(overlays).some((element) => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
    }
    const releaseStaleScrollLock = () => {
      if (!isMobile() || hasVisibleOverlay()) return
      document.body.classList.remove('ant-scrolling-effect')
      for (const element of [document.documentElement, document.body]) {
        if (element.style.overflow === 'hidden') element.style.overflow = ''
        if (element.style.overflowY === 'hidden') element.style.overflowY = ''
        if (element.style.touchAction === 'none') element.style.touchAction = ''
      }
    }

    releaseStaleScrollLock()
    window.addEventListener('pageshow', releaseStaleScrollLock)
    window.addEventListener('focus', releaseStaleScrollLock)
    window.addEventListener('touchend', releaseStaleScrollLock, { passive: true })
    const timer = window.setInterval(releaseStaleScrollLock, 1200)
    return () => {
      window.removeEventListener('pageshow', releaseStaleScrollLock)
      window.removeEventListener('focus', releaseStaleScrollLock)
      window.removeEventListener('touchend', releaseStaleScrollLock)
      window.clearInterval(timer)
    }
  }, [])

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
        <NextAuthProvider>
          <AntdApp>
            {children}
          </AntdApp>
        </NextAuthProvider>
        <Toaster
          position={toastPos}
          richColors
          closeButton
          toastOptions={{ duration: 2200 }}
          style={{ zIndex: 10000 }}
        />
      </ConfigProvider>
    </AntdRegistry>
    </SWRConfig>
  )
}
