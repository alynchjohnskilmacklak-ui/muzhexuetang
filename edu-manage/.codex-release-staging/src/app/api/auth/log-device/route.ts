import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { parseUserAgent } from '@/lib/device'
import { getRequestPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ ok: false })


    const prisma = await getRequestPrisma()
  const userId = (session.user as { id: string }).id
    const ua = req.headers.get('user-agent') || ''
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '未知'
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
}
