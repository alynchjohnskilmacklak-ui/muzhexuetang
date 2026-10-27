import { apiHandler } from '@/lib/api-handler'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { parseUserAgent } from '@/lib/device'
import { getRequestPrisma } from '@/lib/prisma'
import { getTrustedClientIp } from '@/lib/request-ip'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ ok: false })


    const prisma = await getRequestPrisma()
  const userId = (session.user as { id: string }).id
    const ua = req.headers.get('user-agent') || ''
    const ip = getTrustedClientIp(req.headers)
    const { device, os, browser } = parseUserAgent(ua)

    const latest = await prisma.loginRecord.findFirst({
      where: { userId, success: true },
      orderBy: { createdAt: 'desc' },
    })

    if (latest) {
      await prisma.loginRecord.update({
        where: { id: latest.id },
        data: { ip, userAgent: ua, device, os, browser },
      })

      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginIp: ip,
          lastLoginDevice: device,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
})
