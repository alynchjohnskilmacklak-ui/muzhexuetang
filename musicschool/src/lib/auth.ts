import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { validateLoginAccount, type LoginRole } from './login-accounts'
import { prisma } from './prisma'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      sessionMark?: string
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:     { label: 'Email',      type: 'email' },
        password:  { label: 'Password',   type: 'password' },
        loginRole: { label: 'Login Role', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.loginRole) return null

        const loginRole = credentials.loginRole as LoginRole
        if (!['admin', 'teacher', 'parent'].includes(loginRole)) return null

        const result = await validateLoginAccount(
          credentials.email as string,
          credentials.password as string,
          loginRole,
          { persistUser: true, recordAttempt: true, recordSuccess: true }
        )
        if (!result.ok) return null

        return {
          id:    result.user.id,
          email: result.user.email,
          name:  result.user.name,
          role:  result.user.role,
        }
      },
    }),
  ],
  callbacks: {
    async signIn() {
      return true
    },
    async jwt({ token, user }) {
      const t = token as unknown as Record<string, unknown>
      if (user) {
        const u = user as unknown as Record<string, unknown>
        t.role = u.role as string
        t.sub  = u.id as string
        t.id   = u.id as string
        const sessionMark = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        t.sessionMark = sessionMark

        await prisma.user.update({
          where: { id: u.id as string },
          data: {
            currentSessionToken: sessionMark,
            lastLoginAt: new Date(),
          },
        })
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>
        const t = token as unknown as Record<string, unknown>
        u.role        = t.role
        u.id          = t.sub ?? t.id
        u.sessionMark = t.sessionMark
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
        // HTTP keeps the cookie usable; HTTPS enables the secure flag automatically.
        secure:   process.env.NEXTAUTH_URL?.startsWith('https://') === true,
        maxAge:   30 * 24 * 60 * 60,
      },
    },
  },
  pages: {
    signIn: '/login',
  },
})
