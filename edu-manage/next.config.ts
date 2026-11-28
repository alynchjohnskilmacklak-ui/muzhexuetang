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
      "media-src 'self' data: blob: https://dict.youdao.com https://*.youdao.com https://fanyi.baidu.com",
      "font-src 'self' data:",
      "connect-src 'self' https://dict.youdao.com https://*.youdao.com https://fanyi.baidu.com https://api.moonshot.cn https://api.deepseek.com https://wxpusher.zjiecode.com https://*.aliyuncs.com https://*.aliyuncs.com.cn",
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
  // 开发模式下放行临时隧道（cloudflared trycloudflare）与本机回环域名访问 dev 资源（HMR/JS chunk），
  // 否则跨源 dev 资源被 Next 默认拦截，页面 HTML 能出但客户端无法水合，会一直卡在启动页
  allowedDevOrigins: ['*.trycloudflare.com', 'localhost', '127.0.0.1'],
  // 预构建发布模式：产出 .next/standalone 可独立运行目录（服务器免 npm install / build）
  output: 'standalone',
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  compress: true,
  // ali-oss 的传递依赖链包含 vm2 等服务端包，其内部相对导入 Turbopack 无法解析；
  // 标记为服务端外部包，运行时由 Node 原生 require，绕开打包器。
  serverExternalPackages: ['ali-oss', 'urllib', 'proxy-agent', 'pac-proxy-agent', 'pac-resolver', 'degenerator', 'vm2'],
  experimental: {
    // 安全升级策略：Next.js 自动化升级仅采用安全修复版本，规避非安全变更
    agentUpgrade: 'security',
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
        source: '/((?!$|_next/static|_next/image|favicon.ico|images|people|public|api|teacher-portraits|about-images|videos|stickers).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
      {
        // The public landing pages are static and do not contain user data.
        // A short browser cache avoids repeating the initial HTML request while
        // keeping published copy and layouts fresh shortly after deployment.
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60' },
        ],
      },
      {
        source: '/home.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/teacher-portraits/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' },
        ],
      },
      {
        source: '/about-images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' },
        ],
      },
      {
        source: '/videos/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' },
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
        source: '/stickers/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' },
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
