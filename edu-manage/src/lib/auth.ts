import NextAuth, { CredentialsSignin } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { headers } from 'next/headers'
import type { LoginRole } from './login-accounts'
import { parseUserAgent } from './device'
import { emitKick } from './session-events'
import { getPrismaForDivision } from './prisma'
import { authenticateCredentialInput } from './credential-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      teacherId?: string | null
      sessionMark?: string
      division: string
    }
  }
}

async function getClientIp() {
  try {
    const headerList = await headers()
    const forwarded = headerList.get('x-forwarded-for')?.split(',')[0]?.trim()
    return forwarded || headerList.get('x-real-ip') || null
  } catch {
    return null
  }
}

class LoginCredentialsError extends CredentialsSignin {
  code: string

  constructor(code: string) {
    super()
    this.code = code
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:     { label: 'Email',      type: 'email' },
        password:  { label: 'Password',   type: 'password' },
        loginRole: { label: 'Login Role', type: 'text' },
        division:  { label: 'Division',   type: 'text' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password || !credentials?.loginRole) return null

        const loginRole = credentials.loginRole as LoginRole
        if (!['admin', 'teacher', 'parent'].includes(loginRole)) return null

        const division = (credentials.division as string) || undefined
        const email = String(credentials.email).trim().toLowerCase()
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || request.headers.get('x-real-ip')
          || '未知'
        const ua = request.headers.get('user-agent') || ''
        const { device, os, browser } = parseUserAgent(ua)
        const meta = { ip, userAgent: ua, device, os, browser }
        const result = await authenticateCredentialInput({
          email,
          password: credentials.password as string,
          loginRole,
          division,
          meta,
        })
        if (!result.ok) throw new LoginCredentialsError(result.code)

        return {
          id:        result.user.id,
          email:     result.user.email,
          name:      result.user.name,
          role:      result.user.role,
          teacherId: result.user.teacherId,
          division:  result.user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR',
          loginIp:   ip,
          loginDevice: device,
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Force configured site URL to avoid localhost fallback behind reverse proxy.
      const site = process.env.NEXTAUTH_URL || baseUrl
      // Relative path: resolve against the configured site URL.
      if (url.startsWith('/')) return `${site}${url}`
      // Same-origin absolute URL: allow it.
      try {
        if (new URL(url).origin === new URL(site).origin) return url
      } catch {
        // Ignore malformed absolute URLs.
      }
      // Everything else returns to the configured site root.
      return site
    },
    async signIn() {
      return true
    },
    async jwt({ token, user }) {
      const t = token as unknown as Record<string, unknown>
      if (user) {
        const u = user as unknown as Record<string, unknown>
        t.role             = u.role as string
        t.sub              = u.id as string
        t.id               = u.id as string
        t.teacherId        = u.teacherId ?? null
        t.division         = u.division ?? 'JUNIOR'
        const sessionMark = crypto.randomUUID()
        t.sessionMark = sessionMark

        const userDivision = (u.division as string) === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
        const userDb = getPrismaForDivision(userDivision)
        await userDb.user.update({
          where: { id: u.id as string },
          data: {
            currentSessionToken: sessionMark,
            lastLoginAt: new Date(),
            lastLoginIp: (u.loginIp as string | undefined) || await getClientIp(),
            lastLoginDevice: (u.loginDevice as string | undefined) || 'Web',
          },
        })

        emitKick(u.id as string, sessionMark)

        // 教师登录时查 gender 和 avatar 存进 token
        if ((u.role as string) === 'teacher' || (u.role as string) === 'admin') {
          try {
            const userDivision = (u.division as string) === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
            const userDb = getPrismaForDivision(userDivision)
            const teacher = await userDb.teacher.findFirst({
              where: { OR: [{ user: { id: u.id as string } }, { email: u.email as string }] },
              select: { gender: true, avatar: true },
            })
            if (teacher) {
              t.teacherGender = teacher.gender
              t.teacherAvatar = teacher.avatar
            }
          } catch { /* ignore */ }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>
        const t = token as unknown as Record<string, unknown>
        u.role             = t.role
        u.id               = t.sub ?? t.id
        u.teacherId        = t.teacherId ?? null
        u.sessionMark      = t.sessionMark
        u.division         = t.division ?? 'JUNIOR'
        u.gender           = t.teacherGender ?? null
        u.avatar           = t.teacherAvatar ?? null
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path:     '/',
        secure:   process.env.NODE_ENV === 'production' || process.env.NEXTAUTH_URL?.startsWith('https://') === true,
        maxAge:   30 * 24 * 60 * 60,
      },
    },
  },
  pages: {
    signIn: '/login',
  },
})
