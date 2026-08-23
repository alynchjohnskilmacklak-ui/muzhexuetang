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
  const session = await auth()
  const { pathname } = request.nextUrl
  const user = session?.user as { role?: string; id?: string; sessionMark?: string; division?: string } | undefined
  const apiRequest = isApiRequest(pathname)
  const loginRequest = pathname === '/login' || pathname.startsWith('/login/')
  const resetPasswordRequest = pathname === '/reset-password' || pathname.startsWith('/reset-password/')

  // Allow public routes and explicitly protected self-contained setup endpoint.
  if (
    pathname.startsWith('/api/auth') ||
    resetPasswordRequest ||
    pathname === '/api/setup' ||
    pathname.startsWith('/api/wxpusher/callback') ||
    pathname.startsWith('/people/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/business-assets/') ||
    pathname.startsWith('/services/') ||
    pathname.startsWith('/UI_picture/') ||
    pathname.startsWith('/volunteer/picture/') ||
    pathname.startsWith('/volunteer/docs/') ||
    pathname === '/0a039113432e6c816c8f59c7c6c7f211.txt' ||
    pathname === '/api/volunteer/schools'
  ) {
    return NextResponse.next()
  }

  if (!user) {
    if (loginRequest) return NextResponse.next()
    if (apiRequest) return jsonUnauthorized('Unauthorized')
    return NextResponse.redirect(new URL('/login', request.url))
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

  if (pathname === '/') {
    if (role === 'parent') {
      return NextResponse.redirect(new URL('/parent/dashboard', request.url))
    }
    if (role === 'teacher') {
      return NextResponse.redirect(new URL('/teacher/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|business-assets|services|people|UI_picture|volunteer/picture|volunteer/docs|favicon.ico).*)'],
}
