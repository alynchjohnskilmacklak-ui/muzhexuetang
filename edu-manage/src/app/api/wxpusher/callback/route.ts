import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const uid: string = body?.data?.uid || body?.uid
    const extra: string = body?.data?.extra || body?.extra

    if (!uid || !extra) {
      return NextResponse.json({ code: 400, msg: '参数缺失' }, { status: 400 })
    }

    const appToken = body?.data?.appToken || body?.appToken
    if (!appToken || appToken !== process.env.WXPUSHER_APP_TOKEN) {
      return NextResponse.json({ code: 403, msg: '签名无效' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: extra },
      data: { wxpusherUid: uid },
    })

    return NextResponse.json({ code: 1000, msg: 'success' })
  } catch (e) {
    console.error('[wxpusher:callback] error', e)
    return NextResponse.json({ code: 500, msg: 'error' }, { status: 500 })
  }
}
