import { auth } from '@/lib/auth'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl
  const user = session?.user as { role?: string } | undefined

  // Allow public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname === '/api/setup') {
    return NextResponse.next()
  }

  // Redirect unauthenticated users
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = user.role

  // Parent accessing admin routes -> redirect to parent dashboard
  if (!pathname.startsWith('/parent') && !pathname.startsWith('/api') && role === 'parent') {
    return NextResponse.redirect(new URL('/parent/dashboard', request.url))
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
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
