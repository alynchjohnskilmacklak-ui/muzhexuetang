import type { NextConfig } from "next";

const requestedBuildCpus = Number.parseInt(process.env.NEXT_BUILD_WORKERS || '2', 10)
const buildCpus = Number.isFinite(requestedBuildCpus) ? Math.max(1, requestedBuildCpus) : 2

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.aliyuncs.com https://*.aliyuncs.com.cn https://wxpusher.zjiecode.com",
      "font-src 'self' data:",
      "connect-src 'self' https://api.moonshot.cn https://api.deepseek.com https://wxpusher.zjiecode.com https://*.aliyuncs.com https://*.aliyuncs.com.cn",
      "frame-src 'self' https://phet.colorado.edu https://www.geogebra.org https://www.desmos.com https://www.falstad.com https://chemcollective.org",
      "frame-ancestors 'self'",
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
  // ali-oss 的传递依赖链包含 vm2 等服务端包，其内部相对导入 Turbopack 无法解析；
  // 标记为服务端外部包，运行时由 Node 原生 require，绕开打包器。
  serverExternalPackages: ['ali-oss', 'urllib', 'proxy-agent', 'pac-proxy-agent', 'pac-resolver', 'degenerator', 'vm2'],
  typescript: {
    // 题库文件太大，TypeScript栈溢出，暂时跳过build时的类型检查
    ignoreBuildErrors: true,
  },
  experimental: {
    // 构建并行 CPU 上限：避免高核数机器上 Next 多 worker 同时构建导致内存 OOM
    cpus: buildCpus,
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
    return {
      // 首页 = 新版机构介绍公开页（beforeFiles：先于 App Router 根路由匹配）
      beforeFiles: [
        { source: '/', destination: '/home.html' },
      ],
      afterFiles: [
        // 关于牧哲学堂公开页（静态 HTML，SEO 完整，直接服务）
        { source: '/about', destination: '/about.html' },
        // Local-development fallback. In production Nginx serves this prefix
        // directly from /srv/edu-manage-assets before the request reaches Next.
        { source: '/business-assets/services/:path*', destination: '/services/:path*' },
        { source: '/business-assets/marketing/:path*', destination: '/marketing/:path*' },
      ],
    }
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
        // Keep long-lived caching on assets only. `/services/*` contains RSC pages;
        // marking those pages immutable mixes stale RSC payloads with new builds.
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
