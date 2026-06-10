import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import 'katex/dist/katex.min.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: '牧哲学堂 - 教育管理系统',
  description: '教育培训机构综合管理系统',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen">
        <div id="admin-root">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  )
}
