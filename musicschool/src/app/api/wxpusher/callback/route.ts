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

    await prisma.user.update({
      where: { id: extra },
      data: { wxpusherUid: uid },
    })

    console.log(`[wxpusher:callback] 用户 ${extra} 绑定 uid: ${uid}`)
    return NextResponse.json({ code: 1000, msg: 'success' })
  } catch (e) {
    console.error('[wxpusher:callback] error', e)
    return NextResponse.json({ code: 500, msg: 'error' }, { status: 500 })
  }
}
