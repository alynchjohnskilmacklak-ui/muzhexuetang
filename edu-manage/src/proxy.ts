import { auth } from '@/lib/auth'
import { getPrismaForDivision } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'
import { isUserDisabled } from '@/lib/user-status'

function jsonUnauthorized(error: string) {
  return NextResponse.json({ error }, { status: 401 })
}

function jsonServiceUnavailable() {
  return NextResponse.json({ error: '服务暂时不可用，请稍后重试' }, { status: 503 })
}

function isApiRequest(pathname: string) {
  return pathname.startsWith('/api/')
}

type CachedSession = { currentSessionToken: string | null; status: string }
const sessionCache = new Map<string, { data: CachedSession | null; ts: number }>()
const SESSION_CACHE_TTL = 5_000

function getCachedSession(cacheKey: string): CachedSession | null | undefined {
  const entry = sessionCache.get(cacheKey)
  if (entry && Date.now() - entry.ts < SESSION_CACHE_TTL) return entry.data
  if (entry) sessionCache.delete(cacheKey)
  return undefined
}

function setCachedSession(cacheKey: string, data: CachedSession | null) {
  sessionCache.set(cacheKey, { data, ts: Date.now() })
  if (sessionCache.size > 5_000) {
    for (const [k, v] of sessionCache) {
      if (Date.now() - v.ts > SESSION_CACHE_TTL) sessionCache.delete(k)
    }
  }
}

let failCount = 0
let failCountResetAt = 0

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const apiRequest = isApiRequest(pathname)

  // Legacy upload URLs point into `public/uploads`, which would otherwise be
  // served by Next's static file handler without file-level authorization.
  // Route them through the authenticated handler so it can check FileAsset
  // visibility and ownership before reading the object.
  if (pathname === '/uploads' || pathname.startsWith('/uploads/')) {
    let storageKey: string
    try {
      storageKey = decodeURIComponent(pathname.replace(/^\/uploads\/?/, ''))
    } catch {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
    }
    if (!storageKey) return NextResponse.json({ error: 'Invalid file' }, { status: 400 })

    const uploadUrl = request.nextUrl.clone()
    // Encode the complete storage key as one route segment. Storage keys
    // include slashes, while the filename route is intentionally one segment.
    uploadUrl.pathname = '/api/uploads/' + encodeURIComponent(storageKey)
    return NextResponse.rewrite(uploadUrl)
  }
  const publicTeacherShowcaseRequest =
    ['GET', 'HEAD'].includes(request.method) &&
    (pathname === '/api/public/teacher-showcase' || pathname === '/api/public/teacher-showcase/portrait')
  const loginRequest = pathname === '/login' || pathname.startsWith('/login/')
  const parentTermExpiredRequest = loginRequest && request.nextUrl.searchParams.get('error') === 'PARENT_TERM_EXPIRED'
  const resetPasswordRequest = pathname === '/reset-password' || pathname.startsWith('/reset-password/')
  const baiduVerificationRequest = pathname === '/baidu_verify_codeva-LcCyyIUZRF.html'
  const bingVerificationRequest = pathname === '/BingSiteAuth.xml'
  const byteDanceVerificationRequest = pathname === '/ByteDanceVerify.html'
  const shenmaVerificationRequest = pathname === '/shenma-site-verification.txt'
  const aboutRequest = pathname === '/about'

  // The public brand homepage, the about page and crawler discovery files are
  // open to everyone — signed-in visitors also see the public site at "/",
  // and use the "进入系统" button to reach their dashboard.
  if (pathname === '/' || pathname === '/about' || pathname === '/home.html' || pathname === '/about.html' || pathname === '/robots.txt' || pathname === '/sitemap.xml' || pathname === '/manifest.json' || pathname === '/island-demo' || pathname.startsWith('/island-demo/')) {
    return NextResponse.next()
  }

  // Allow public routes and explicitly protected self-contained setup endpoint.
  if (
    pathname.startsWith('/api/auth') ||
    baiduVerificationRequest ||
    bingVerificationRequest ||
    byteDanceVerificationRequest ||
    shenmaVerificationRequest ||
    aboutRequest ||
    resetPasswordRequest ||
    pathname.startsWith('/WW_verify') ||
    pathname === '/api/setup' ||
    pathname === '/api/qywx/event' ||
    pathname === '/api/ai/public-assistant' ||
    pathname === '/api/vocab/phonetic' ||
    pathname.startsWith('/api/audio/') ||
    publicTeacherShowcaseRequest ||
    // Cron endpoints authenticate their own bearer token. Proxy only lets the
    // request reach that handler; it does not authorize the operation.
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/people/') ||
    pathname.startsWith('/avatars/') ||
    pathname.startsWith('/teacher-portraits/') ||
    pathname.startsWith('/about-images/') ||
    pathname.startsWith('/videos/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/stickers/') ||
    pathname.startsWith('/business-assets/') ||
    pathname.startsWith('/services/') ||
    pathname.startsWith('/UI_picture/') ||
    pathname.startsWith('/volunteer/picture/') ||
    pathname.startsWith('/volunteer/docs/') ||
    pathname === '/pdf.worker.min.mjs' ||
    pathname === '/echarts.min.js' ||
    pathname === '/0a039113432e6c816c8f59c7c6c7f211.txt' ||
    pathname === '/api/volunteer/schools'
  ) {
    return NextResponse.next()
  }

  // Public pages and static media should never pay the session lookup cost.
  // Keep this after the complete public allowlist and before auth().
  const session = await auth()
  const user = session?.user as { role?: string; id?: string; sessionMark?: string; division?: string } | undefined

  if (!user) {
    if (loginRequest) return NextResponse.next()
    if (apiRequest) return jsonUnauthorized('Unauthorized')
    const loginUrl = new URL('/login', request.url)
    if (pathname === '/parent' || pathname.startsWith('/parent/')) {
      loginUrl.searchParams.set('returnTo', `${pathname}${request.nextUrl.search}`)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (user.id && !user.sessionMark) {
    if (loginRequest) return NextResponse.next()
    if (apiRequest) return jsonUnauthorized('登录状态已过期，请重新登录')
    return NextResponse.redirect(new URL('/login?reason=expired', request.url))
  }

  // Reset fail counter after 60s of successful DB queries
  if (Date.now() - failCountResetAt > 60_000) { failCount = 0; failCountResetAt = Date.now() }

  if (user.id && user.sessionMark) {
    try {
      const division = user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
      const cacheKey = `${division}:${user.id}`
      let dbUser = getCachedSession(cacheKey)
      if (dbUser === undefined) {
        const prisma = getPrismaForDivision(division)
        const row = await prisma.user.findUnique({
          where: { id: user.id },
          select: { currentSessionToken: true, status: true },
        })
        dbUser = row ? { currentSessionToken: row.currentSessionToken, status: row.status } : null
        setCachedSession(cacheKey, dbUser)
      }

      if (!dbUser) {
        if (apiRequest) return jsonUnauthorized('账号不存在')
        if (loginRequest) return NextResponse.next()
        return NextResponse.redirect(new URL('/login', request.url))
      }

      if (dbUser && isUserDisabled(dbUser.status)) {
        if (apiRequest) return jsonUnauthorized('账号已停用')
        if (loginRequest) return NextResponse.next()
        return NextResponse.redirect(new URL('/login?reason=disabled', request.url))
      }

      if (dbUser?.currentSessionToken !== user.sessionMark) {
        if (apiRequest) return jsonUnauthorized('账号已在其他设备登录，请重新登录')
        if (loginRequest) return NextResponse.next()
        return NextResponse.redirect(new URL('/login?reason=kicked', request.url))
      }
    } catch (err) {
      console.error('[proxy] session validation DB error:', err instanceof Error ? err.message : err)
      // Mutating APIs fail closed immediately; reads fail closed after repeated DB errors.
      failCount += 1
      const isMutation = apiRequest && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
      if (isMutation || failCount >= 3) {
        if (apiRequest) return jsonServiceUnavailable()
        if (loginRequest) return NextResponse.next()
        return NextResponse.redirect(new URL('/login?reason=db-error', request.url))
      }
      if (loginRequest) return NextResponse.next()
    }
  }

  const role = user.role

  if (loginRequest) {
    if (parentTermExpiredRequest) return NextResponse.next()
    if (role === 'parent') return NextResponse.redirect(new URL('/parent/dashboard', request.url))
    if (role === 'teacher') return NextResponse.redirect(new URL('/teacher/dashboard', request.url))
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Page role redirects only. API permission checks remain inside API handlers.
  const isParentRoute = pathname === '/parent' || pathname.startsWith('/parent/')
  if (!apiRequest && !isParentRoute && role === 'parent') {
    return NextResponse.redirect(new URL('/parent/dashboard', request.url))
  }

  if (!apiRequest && (pathname === '/teacher' || pathname.startsWith('/teacher/')) && role !== 'teacher') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!apiRequest && !(pathname === '/teacher' || pathname.startsWith('/teacher/')) && role === 'teacher') {
    return NextResponse.redirect(new URL('/teacher/dashboard', request.url))
  }

  if (!apiRequest && isParentRoute && role !== 'parent') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!$|_next/static|_next/image|images|icons|picture|stickers|marketing|business-assets|services|people|avatars|teacher-portraits|videos|UI_picture|volunteer|brand|about\.html|home\.html|manifest\.json|about-images|pdf\.worker\.min\.mjs|echarts\.min\.js|favicon\.ico|logo-export\.jpg|logo-small\.png|logo-banner\.jpg|file\.svg|globe\.svg|next\.svg|vercel\.svg|window\.svg|shenma-site-verification\.txt|ByteDanceVerify\.html|robots\.txt|sitemap\.xml|WW_verify|0a039113432e6c816c8f59c7c6c7f211\.txt).*)'],
}
