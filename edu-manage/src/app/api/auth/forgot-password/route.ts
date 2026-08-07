import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { apiHandler } from '@/lib/api-handler'
import { getPublicAuthDatabases, parseAuthDivision } from '@/lib/auth/public-account-db'
import { isUserDisabled } from '@/lib/user-status'

export const dynamic = 'force-dynamic'

const GENERIC_MESSAGE = '如果账号存在，重置链接将发送到您绑定的微信'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function sendResetLink(uid: string, rawToken: string) {
  const appToken = process.env.WXPUSHER_APP_TOKEN
  if (!appToken) return

  const resetUrl = `${process.env.NEXTAUTH_URL || ''}/reset-password?token=${rawToken}`
  const response = await fetch('https://wxpusher.zjiecode.com/api/send/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appToken,
      content: `【牧哲学堂】您正在申请重置密码，请点击链接完成重置（30分钟内有效）：${resetUrl}`,
      summary: '密码重置',
      contentType: 1,
      uids: [uid],
    }),
  })
  if (!response.ok) throw new Error(`WxPusher returned ${response.status}`)
}

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const account = typeof body.account === 'string' ? body.account.trim() : ''
  const division = parseAuthDivision(body.division)

  if (!account) {
    return NextResponse.json({ error: '请输入手机号或账号' }, { status: 400 })
  }
  if (body.division != null && !division) {
    return NextResponse.json({ error: '无效学部' }, { status: 400 })
  }

  const databases = getPublicAuthDatabases(division)
  const matches = await Promise.all(databases.map(async database => ({
    ...database,
    user: await database.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: account, mode: 'insensitive' } },
          { teacher: { phone: account } },
        ],
      },
      select: { id: true, status: true, wxpusherUid: true },
    }),
  })))

  await Promise.all(matches.map(async ({ prisma, user }) => {
    if (!user || isUserDisabled(user.status)) return

    const rawToken = crypto.randomBytes(32).toString('hex')
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      }),
    ])

    if (user.wxpusherUid) {
      try {
        await sendResetLink(user.wxpusherUid, rawToken)
      } catch (error) {
        console.error('[forgot-password] failed to send reset link', {
          userId: user.id,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }))

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE })
})
