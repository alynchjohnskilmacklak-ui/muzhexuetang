import type { Metadata, Viewport } from 'next'
import { SiteFilingFooter } from '@/components/SiteFilingFooter'
import { auth } from '@/lib/auth'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://muzhexuetang.xyz'),
  title: { default: '牧哲学堂', template: '%s｜牧哲学堂' },
  description: '牧哲学堂教育教学与家校沟通平台',
  keywords: '牧哲学堂,牧哲学堂教育,太原牧哲学堂,初中辅导,高中辅导,学情追踪,家校沟通,数字化教务',
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <div id="admin-root">
          <Providers session={session}>{children}</Providers>
          <SiteFilingFooter />
        </div>
      </body>
    </html>
  )
}
