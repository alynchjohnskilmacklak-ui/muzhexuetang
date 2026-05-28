import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'

function jsonUnauthorized(error: string) {
  return NextResponse.json({ error }, { status: 401 })
}

function isApiRequest(pathname: string) {
  return pathname.startsWith('/api/')
}

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
    pathname.startsWith('/volunteer/docs/')
  ) {
    return NextResponse.next()
  }

  if (!user) {
    if (apiRequest) return jsonUnauthorized('Unauthorized')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user.id && user.sessionMark) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { currentSessionToken: true, status: true },
      })

      if (dbUser?.status === 'disabled') {
        if (apiRequest) return jsonUnauthorized('账号已停用')
        return NextResponse.redirect(new URL('/login?reason=disabled', request.url))
      }

      if (dbUser?.currentSessionToken && dbUser.currentSessionToken !== user.sessionMark) {
        if (apiRequest) return jsonUnauthorized('账号已在其他设备登录，请重新登录')
        return NextResponse.redirect(new URL('/login?reason=kicked', request.url))
      }
    } catch {
      // Do not block access when the database is temporarily unavailable.
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
