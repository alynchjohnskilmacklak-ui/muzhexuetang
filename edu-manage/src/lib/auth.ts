import NextAuth, { CredentialsSignin } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { headers } from 'next/headers'
import { normalizeLoginPhone, type LoginRole } from './login-accounts'
import { parseUserAgent } from './device'
import { emitKick } from './session-events'
import { getPrismaForDivision } from './prisma'
import { authenticateCredentialInput } from './credential-auth'
import { getTrustedClientIp } from './request-ip'

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
      gender?: string | null
      avatar?: string | null
    }
  }
}

async function getClientIp() {
  try {
    const headerList = await headers()
    return getTrustedClientIp(headerList)
  } catch {
    return null
  }
}

async function getStaffPortrait(
  db: ReturnType<typeof getPrismaForDivision>,
  identity: Record<string, unknown>,
) {
  const id = typeof identity.id === 'string' ? identity.id : typeof identity.sub === 'string' ? identity.sub : ''
  const email = typeof identity.email === 'string' ? identity.email : ''
  const name = typeof identity.name === 'string' ? identity.name.trim() : ''
  const teacherId = typeof identity.teacherId === 'string' ? identity.teacherId : ''
  const suppliedPhone = typeof identity.loginPhone === 'string'
    ? identity.loginPhone
    : typeof identity.phone === 'string' ? identity.phone : ''

  const account = id
    ? await db.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, phone: true, avatar: true, teacherId: true } })
    : email
      ? await db.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, phone: true, avatar: true, teacherId: true } })
      : null
  const resolvedId = id || account?.id || ''
  const resolvedEmail = email || account?.email || ''
  const resolvedName = name || account?.name.trim() || ''
  const resolvedPhone = normalizeLoginPhone(suppliedPhone || account?.phone || '')
  const linkedTeacherId = teacherId || account?.teacherId || ''

  let teacher = linkedTeacherId
    ? await db.teacher.findUnique({ where: { id: linkedTeacherId }, select: { gender: true, avatar: true } })
    : null

  if (!teacher && resolvedId) {
    teacher = await db.teacher.findFirst({
      where: { user: { id: resolvedId } },
      select: { gender: true, avatar: true },
    })
  }
  if (!teacher && resolvedPhone) {
    teacher = await db.teacher.findUnique({
      where: { phone: resolvedPhone },
      select: { gender: true, avatar: true },
    })
  }
  if (!teacher && resolvedEmail) {
    teacher = await db.teacher.findFirst({
      where: { email: resolvedEmail },
      select: { gender: true, avatar: true },
    })
  }
  if (!teacher && resolvedName) {
    const sameNameProfiles = await db.teacher.findMany({
      where: { name: resolvedName, status: { not: 'RESIGNED' } },
      select: { gender: true, avatar: true },
      take: 2,
    })
    if (sameNameProfiles.length === 1) teacher = sameNameProfiles[0]
  }

  return {
    avatar: teacher?.avatar || account?.avatar || null,
    gender: teacher?.gender || null,
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
        email:     { label: 'Email or phone', type: 'text' },
        identifierType: { label: 'Identifier Type', type: 'text' },
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
        const ip = getTrustedClientIp(request.headers)
        const ua = request.headers.get('user-agent') || ''
        const { device, os, browser } = parseUserAgent(ua)
        const meta = { ip, userAgent: ua, device, os, browser }
        const result = await authenticateCredentialInput({
          email,
          password: credentials.password as string,
          loginRole,
          identifierType: credentials.identifierType === 'phone' ? 'phone' : 'email',
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
          loginPhone: credentials.identifierType === 'phone' ? normalizeLoginPhone(String(credentials.email)) : null,
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
      }

      // Refresh staff portraits for both new sign-ins and older sessions. Admin
      // accounts may be linked to a teacher archive by phone or a unique name.
      const identity = (user || t) as unknown as Record<string, unknown>
      const role = String(identity.role ?? t.role ?? '')
      const lastPortraitCheck = typeof t.teacherAvatarCheckedAt === 'number' ? t.teacherAvatarCheckedAt : 0
      if ((role === 'teacher' || role === 'admin') && (user || Date.now() - lastPortraitCheck >= 5 * 60 * 1000)) {
        try {
          const division = String(identity.division ?? t.division ?? '') === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
          const portrait = await getStaffPortrait(getPrismaForDivision(division), identity)
          t.teacherGender = portrait.gender
          t.teacherAvatar = portrait.avatar
          t.teacherAvatarCheckedAt = Date.now()
        } catch { /* keep the last known portrait and let the layout use its real-photo fallback */ }
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
