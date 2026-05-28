import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createBindQrcode } from '@/lib/wxpusher'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.WXPUSHER_APP_TOKEN) {
    return NextResponse.json({
      error: '微信推送服务未配置，请联系管理员',
    }, { status: 500 })
  }

  const userId = (session.user as { id: string }).id
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.wxpusherUid) {
    return NextResponse.json({ bound: true, uid: user.wxpusherUid })
  }

  const result = await createBindQrcode(userId)
  if (!result.success) {
    console.error('[wxpusher:qrcode] failed:', result.error)
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ bound: false, qrcodeUrl: result.url })
})
