import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { AuthError } from '@/lib/auth/guards'
import { qywxEnabled, listQywxFollowUsers, listQywxExternalIdsByMember, getQywxExternalDetail } from '@/lib/qywx'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

/** 列出未绑定家长 + 企微学员候选（供管理端一键关联） */
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') throw new AuthError('Unauthorized', 403)
  if (!qywxEnabled()) return NextResponse.json({ error: '企业微信通道未开启' }, { status: 400 })

  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user as Record<string, unknown> | undefined, req.nextUrl.searchParams.get('division'))

  // 企微学员候选（含所属成员 userid，作为群发 sender）
  const contacts: Array<{ external_userid: string; name: string; member: string }> = []
  const members = await listQywxFollowUsers()
  for (const member of members) {
    const ids = await listQywxExternalIdsByMember(member)
    for (const id of ids) {
      const detail = await getQywxExternalDetail(id)
      contacts.push({ external_userid: id, name: detail?.name || id, member })
    }
  }

  // 未绑定企微学员的系统家长（有在读学生）
  const parents = await prisma.user.findMany({
    where: {
      role: 'parent',
      status: 'active',
      qywxExternalUserId: null,
      division,
      students: { some: {} },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      students: { select: { name: true }, take: 3 },
    },
    orderBy: { name: 'asc' },
    take: 100,
  })

  return NextResponse.json({
    parents: parents.map((p) => ({ id: p.id, name: p.name, phone: p.phone, children: p.students.map((s) => s.name) })),
    contacts,
    members,
  })
})

/** 绑定：家长账号 ↔ 企微学员（含发送成员） */
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') throw new AuthError('Unauthorized', 403)
  if (!qywxEnabled()) return NextResponse.json({ error: '企业微信通道未开启' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { userId?: string; externalUserId?: string; senderUserId?: string }
  if (!body.userId || !body.externalUserId) {
    return NextResponse.json({ error: '缺少 userId 或 externalUserId' }, { status: 400 })
  }

  const prisma = await getRequestPrisma()
  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: {
      qywxExternalUserId: body.externalUserId,
      qywxSenderUserId: body.senderUserId || null,
    },
    select: { id: true, name: true, qywxExternalUserId: true, qywxSenderUserId: true },
  })
  return NextResponse.json({ ok: true, user: updated })
})

/** 解除绑定 */
export const DELETE = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') throw new AuthError('Unauthorized', 403)

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

  const prisma = await getRequestPrisma()
  await prisma.user.update({
    where: { id: userId },
    data: { qywxExternalUserId: null, qywxSenderUserId: null },
  })
  return NextResponse.json({ ok: true })
})
