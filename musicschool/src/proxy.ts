import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl
  const user = session?.user as { role?: string; id?: string; sessionMark?: string } | undefined

  // Allow public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/setup' ||
    pathname === '/api/dashboard' ||
    pathname.startsWith('/api/wxpusher/callback') ||
    pathname.startsWith('/people/') ||
    pathname.startsWith('/uploads/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/volunteer/picture/') ||
    pathname.startsWith('/volunteer/docs/')
  ) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user.id && user.sessionMark && !pathname.startsWith('/api/')) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { currentSessionToken: true, status: true },
      })

      if (dbUser?.status === 'disabled') {
        return NextResponse.redirect(new URL('/login?reason=disabled', request.url))
      }

      if (dbUser?.currentSessionToken && dbUser.currentSessionToken !== user.sessionMark) {
        return NextResponse.redirect(new URL('/login?reason=kicked', request.url))
      }
    } catch {
      // Do not block access when the database is temporarily unavailable.
    }
  }

  const role = user.role

  // Parent accessing admin routes -> redirect to parent dashboard
  if (!pathname.startsWith('/parent') && !pathname.startsWith('/api') && role === 'parent') {
    return NextResponse.redirect(new URL('/parent/dashboard', request.url))
  }

  if ((pathname === '/teacher' || pathname.startsWith('/teacher/')) && role !== 'teacher') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!(pathname === '/teacher' || pathname.startsWith('/teacher/')) && !pathname.startsWith('/api') && role === 'teacher') {
    return NextResponse.redirect(new URL('/teacher/dashboard', request.url))
  }

  // Admin/teacher accessing parent routes -> redirect to admin dashboard
  if (pathname.startsWith('/parent') && role !== 'parent') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role-based root redirect
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
  matcher: ['/((?!_next/static|_next/image|images|people|uploads|volunteer/picture|volunteer/docs|favicon.ico).*)'],
}
