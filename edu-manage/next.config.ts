import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // 生产环境去掉 'unsafe-eval'；开发环境保留以兼容 Next HMR
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      // img-src 保留 https:：图片可能来自可配置的 OSS/外链，收窄到单域名会导致图片不显示
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // 浏览器只与同源 API 通信（AI/OSS/WxPusher 均为服务端调用），收紧到 'self'
      "connect-src 'self'",
      "frame-src 'self' https://phet.colorado.edu https://www.geogebra.org https://www.desmos.com https://www.falstad.com https://chemcollective.org",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]
    : []),
]

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', 'lodash', 'date-fns'],
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [375, 750, 828, 1080, 1200],
    imageSizes: [64, 128, 180, 256, 384],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/((?!_next/static|_next/image|favicon.ico|images|people|public|api).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/people/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
};

export default nextConfig;
