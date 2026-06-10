import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'

function jsonUnauthorized(error: string) {
  return NextResponse.json({ error }, { status: 401 })
}

function isApiRequest(pathname: string) {
  return pathname.startsWith('/api/')
}

type CachedSession = { currentSessionToken: string | null; status: string }
const sessionCache = new Map<string, { data: CachedSession | null; ts: number }>()
const SESSION_CACHE_TTL = 5_000

function getCachedSession(userId: string): CachedSession | null | undefined {
  const entry = sessionCache.get(userId)
  if (entry && Date.now() - entry.ts < SESSION_CACHE_TTL) return entry.data
  if (entry) sessionCache.delete(userId)
  return undefined
}

function setCachedSession(userId: string, data: CachedSession | null) {
  sessionCache.set(userId, { data, ts: Date.now() })
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
  const user = session?.user as { role?: string; id?: string; sessionMark?: string } | undefined
  const apiRequest = isApiRequest(pathname)

  // Allow public routes and explicitly protected self-contained setup endpoint.
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/setup' ||
    pathname.startsWith('/api/wxpusher/callback') ||
    pathname.startsWith('/people/') ||
    pathname.startsWith('/uploads/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/UI_picture/') ||
    pathname.startsWith('/volunteer/picture/') ||
    pathname.startsWith('/volunteer/docs/') ||
    pathname === '/api/volunteer/schools'
  ) {
    return NextResponse.next()
  }

  if (!user) {
    if (apiRequest) return jsonUnauthorized('Unauthorized')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Reset fail counter after 60s of successful DB queries
  if (Date.now() - failCountResetAt > 60_000) { failCount = 0; failCountResetAt = Date.now() }

  if (user.id && user.sessionMark) {
    try {
      let dbUser = getCachedSession(user.id)
      if (dbUser === undefined) {
        const row = await prisma.user.findUnique({
          where: { id: user.id },
          select: { currentSessionToken: true, status: true },
        })
        dbUser = row ? { currentSessionToken: row.currentSessionToken, status: row.status } : null
        setCachedSession(user.id, dbUser)
      }

      if (dbUser?.status === 'disabled') {
        if (apiRequest) return jsonUnauthorized('账号已停用')
        return NextResponse.redirect(new URL('/login?reason=disabled', request.url))
      }

      if (dbUser?.currentSessionToken && dbUser.currentSessionToken !== user.sessionMark) {
        if (apiRequest) return jsonUnauthorized('账号已在其他设备登录，请重新登录')
        return NextResponse.redirect(new URL('/login?reason=kicked', request.url))
      }
    } catch (err) {
      console.error('[proxy] session validation DB error:', err instanceof Error ? err.message : err)
      // Fail closed after 3 consecutive DB errors to prevent security bypass during outages
      failCount += 1
      if (failCount >= 3) {
        if (apiRequest) return jsonUnauthorized('服务暂时不可用，请稍后重试')
        return NextResponse.redirect(new URL('/login?reason=db-error', request.url))
      }
    }
  }

  const role = user.role

  // Page role redirects only. API permission checks remain inside API handlers.
  if (!apiRequest && !pathname.startsWith('/parent') && role === 'parent') {
    return NextResponse.redirect(new URL('/parent/dashboard', request.url))
  }

  if (!apiRequest && (pathname === '/teacher' || pathname.startsWith('/teacher/')) && role !== 'teacher') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!apiRequest && !(pathname === '/teacher' || pathname.startsWith('/teacher/')) && role === 'teacher') {
    return NextResponse.redirect(new URL('/teacher/dashboard', request.url))
  }

  if (!apiRequest && pathname.startsWith('/parent') && role !== 'parent') {
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
  matcher: ['/((?!_next/static|_next/image|images|people|uploads|UI_picture|volunteer/picture|volunteer/docs|favicon.ico).*)'],
}
