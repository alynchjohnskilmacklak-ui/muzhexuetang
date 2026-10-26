import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.aliyuncs.com https://*.aliyuncs.com.cn https://wxpusher.zjiecode.com",
      "font-src 'self' data:",
      "connect-src 'self' https://api.moonshot.cn https://api.deepseek.com https://wxpusher.zjiecode.com https://*.aliyuncs.com https://*.aliyuncs.com.cn",
      "frame-src 'self' https://phet.colorado.edu https://www.geogebra.org https://www.desmos.com https://www.falstad.com https://chemcollective.org",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
    ].join('; '),
  },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]
    : []),
]

const nextConfig: NextConfig = {
  // 预构建发布模式：产出 .next/standalone 可独立运行目录（服务器免 npm install / build）
  output: 'standalone',
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', 'lodash', 'date-fns'],
    proxyClientMaxBodySize: '210mb',
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [375, 750, 828, 1080, 1200],
    imageSizes: [64, 128, 180, 256, 384],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: '**.aliyuncs.com' },
      { protocol: 'https', hostname: '**.aliyuncs.com.cn' },
    ],
  },
  async rewrites() {
    return [
      // Local-development fallback. In production Nginx serves this prefix
      // directly from /srv/edu-manage-assets before the request reaches Next.
      { source: '/business-assets/services/:path*', destination: '/services/:path*' },
      { source: '/business-assets/marketing/:path*', destination: '/marketing/:path*' },
    ]
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
        source: '/services/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/business-assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' },
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
