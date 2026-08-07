import type { Metadata, Viewport } from 'next'
import 'katex/dist/katex.min.css'
import { SiteFilingFooter } from '@/components/SiteFilingFooter'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: '牧哲学堂 - 教育管理系统',
  description: '教育培训机构综合管理系统',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: '牧哲学堂',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <div id="admin-root">
          <Providers>{children}</Providers>
          <SiteFilingFooter />
        </div>
      </body>
    </html>
  )
}
