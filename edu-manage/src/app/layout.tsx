import type { Metadata, Viewport } from 'next'
import 'katex/dist/katex.min.css'
import { SiteFilingFooter } from '@/components/SiteFilingFooter'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://muzhexuetang.xyz'),
  title: { default: '牧哲学堂', template: '%s｜牧哲学堂' },
  description: '牧哲学堂教育教学与家校沟通平台',
  keywords: '牧哲学堂,牧哲学堂教育,太原牧哲学堂,中小学辅导,初中辅导,高中辅导,语文数学英语物理化学生物',
  applicationName: '牧哲学堂',
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: '牧哲学堂',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/images/logo.jpg',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
