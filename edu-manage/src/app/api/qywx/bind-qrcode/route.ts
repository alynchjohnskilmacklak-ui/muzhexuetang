import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { createQywxContactWay, qywxEnabled } from '@/lib/qywx'

export const dynamic = 'force-dynamic'

/**
 * 为家长生成企业微信「联系我」专属二维码。
 * 家长微信扫码 → 微信原生确认添加 → 企微回调 change_external_contact（state=家长账号 id）
 * → /api/qywx/event 自动写回 qywxExternalUserId，完成绑定。
 *
 * body: { parentUserId: string, termId?: string }
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  if (!qywxEnabled()) {
    return NextResponse.json({ error: '企业微信通道未开启（QYWX_ENABLED 未配置为 true）' }, { status: 400 })
  }

  const body = (await request.json().catch(() => ({}))) as { parentUserId?: string; termId?: string }
  const parentUserId = typeof body.parentUserId === 'string' ? body.parentUserId : ''
  const termId = typeof body.termId === 'string' ? body.termId.trim() : ''
  if (!parentUserId) return NextResponse.json({ error: '缺少家长账号' }, { status: 400 })

  if (termId) {
    const term = await admin.prisma.academicTerm.findFirst({
      where: { id: termId, division: admin.division },
      select: { id: true },
    })
    if (!term) return NextResponse.json({ error: '所选批次不存在或不属于当前校区' }, { status: 404 })
  }

  const parent = await admin.prisma.user.findFirst({
    where: {
      id: parentUserId,
      role: 'parent',
      division: admin.division,
      status: { not: 'deleted' },
      ...(termId ? {
        students: {
          some: {
            division: admin.division,
            deletedAt: null,
            status: { notIn: ['INACTIVE', 'ARCHIVED'] },
            termMemberships: {
              some: { termId, status: { in: ['ACTIVE', 'COMPLETED'] } },
            },
          },
        },
      } : {}),
    },
    select: { id: true, name: true, qywxExternalUserId: true, qywxSenderUserId: true },
  })
  if (!parent) {
    return NextResponse.json({ error: '家长账号不存在或不属于当前校区' }, { status: 404 })
  }
  if (parent.qywxExternalUserId) {
    return NextResponse.json({
      ok: true,
      alreadyBound: true,
      externalUserId: parent.qywxExternalUserId,
      senderUserId: parent.qywxSenderUserId,
    })
  }

  const owner = await admin.prisma.user.findUnique({
    where: { id: admin.id },
    select: { qywxUserId: true, name: true },
  })
  if (!owner?.qywxUserId) {
    return NextResponse.json(
      { error: '当前管理员账号还没有绑定企业微信成员身份，请先在「企微绑定」里绑定自己（否则二维码没有归属成员）' },
      { status: 400 },
    )
  }

  const created = await createQywxContactWay({
    userid: owner.qywxUserId,
    state: parent.id,
    remark: `家长绑定 ${parent.name || ''}`.trim(),
  })
  if (!created.ok) {
    return NextResponse.json({ error: created.error, rawCode: created.rawCode }, { status: 502 })
  }

  // 企微返回的 qr_code 是图片地址，浏览器直接外链引用会被防盗链拦成裂图；
  // 这里在服务端取回图片并转成 data URL 内联返回，避免跨域/防盗链问题。
  let qrCodeDataUrl: string | null = null
  try {
    const image = await fetch(created.qrCode, { cache: 'no-store' })
    if (image.ok) {
      const buffer = Buffer.from(await image.arrayBuffer())
      const type = image.headers.get('content-type') || 'image/png'
      if (buffer.byteLength > 0) qrCodeDataUrl = `data:${type.split(';')[0]};base64,${buffer.toString('base64')}`
    }
  } catch {
    qrCodeDataUrl = null
  }

  return NextResponse.json({
    ok: true,
    qrCode: created.qrCode,
    qrCodeDataUrl,
    configId: created.configId,
    state: parent.id,
    owner: owner.qywxUserId,
    parent: { id: parent.id, name: parent.name },
  })
})
