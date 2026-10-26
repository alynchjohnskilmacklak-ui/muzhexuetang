import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { isUserDisabled } from '@/lib/user-status'
import { parseUserAgent } from '@/lib/device'
import { recordDailySessionAccess } from '@/lib/login-records'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id?: string; email?: string; sessionMark?: string } | undefined

  if (!user?.id) {
    return NextResponse.json({ status: 'unauthenticated' }, { status: 401 })
  }


  const prisma = await getRequestPrisma()
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentSessionToken: true, status: true },
  })

  if (!dbUser) {
    return NextResponse.json({ status: 'not_found' }, { status: 401 })
  }
  if (isUserDisabled(dbUser.status)) {
    return NextResponse.json({ status: 'disabled' }, { status: 403 })
  }
  if (!user.sessionMark || dbUser.currentSessionToken !== user.sessionMark) {
    return NextResponse.json({ status: 'kicked' }, { status: 401 })
  }

  let accessRecorded = false
  if (request.nextUrl.searchParams.get('recordAccess') === '1' && user.email) {
    const userAgent = request.headers.get('user-agent') || ''
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '未知'
    const { device, os, browser } = parseUserAgent(userAgent)
    try {
      accessRecorded = await recordDailySessionAccess(
        prisma,
        { id: user.id, email: user.email },
        { ip, userAgent, device, os, browser },
      )
    } catch (error) {
      // Access telemetry must never break an otherwise valid session.
      console.error(
        '[session-ping] failed to record daily access:',
        error instanceof Error ? error.message : error,
      )
    }
  }

  return NextResponse.json({ status: 'ok', accessRecorded })
})
