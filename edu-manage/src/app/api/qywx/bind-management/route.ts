import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { AuthError } from '@/lib/auth/guards'
import { qywxEnabled, listQywxFollowUsers, listQywxExternalIdsByMember, getQywxExternalDetail } from '@/lib/qywx'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

async function mapWithConcurrency<T, R>(values: T[], concurrency: number, mapper: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length)
  let nextIndex = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex++
      results[index] = await mapper(values[index])
    }
  }))
  return results
}

/** 列出系统家长 + 企微学员候选（供管理端确认关联或解除关联） */
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') throw new AuthError('Unauthorized', 403)
  if (!qywxEnabled()) return NextResponse.json({ error: '企业微信通道未开启' }, { status: 400 })

  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user as Record<string, unknown> | undefined, req.nextUrl.searchParams.get('division'))
  const termId = req.nextUrl.searchParams.get('termId')?.trim() || null
  if (termId) {
    const term = await prisma.academicTerm.findFirst({ where: { id: termId, division }, select: { id: true } })
    if (!term) return NextResponse.json({ error: '所选批次不存在或不属于当前校区' }, { status: 404 })
  }
  const batchStudentWhere: Prisma.StudentWhereInput = {
    division,
    deletedAt: null,
    status: { notIn: ['INACTIVE', 'ARCHIVED'] },
    ...(termId ? {
      termMemberships: {
        some: { termId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      },
    } : {}),
  }

  const [staff, parents, boundParents] = await Promise.all([
    prisma.user.findMany({
      where: { division, role: { in: ['admin', 'teacher'] }, status: 'active' },
      select: { id: true, name: true, role: true, qywxUserId: true },
      orderBy: { name: 'asc' },
    }),
    // 显示已绑定与未绑定家长，确保管理员可以看到绑定状态并主动解除。
    prisma.user.findMany({
      where: {
        role: 'parent',
        status: 'active',
        division,
        students: { some: batchStudentWhere },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        qywxExternalUserId: true,
        qywxSenderUserId: true,
        students: {
          where: batchStudentWhere,
          select: {
            id: true,
            name: true,
            grade: true,
            termMemberships: {
              where: termId ? { termId, status: { in: ['ACTIVE', 'COMPLETED'] } } : {},
              select: { grade: true },
              take: 1,
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { qywxExternalUserId: { not: null } },
      select: { qywxExternalUserId: true },
    }),
  ])
  const boundExternalUserIds = new Set(
    boundParents.map((parent) => parent.qywxExternalUserId).filter((id): id is string => Boolean(id)),
  )

  // Keep parent/staff data visible when WeCom is unavailable, and return its
  // actual error instead of silently turning a permission failure into []
  // (which the UI used to present as “no contacts”).
  let wecomError: string | null = null
  let contacts: Array<{ external_userid: string; name: string; member: string; bound: boolean }> = []
  let matchedStaffCount = 0
  try {
    const followUsers = await listQywxFollowUsers()
    const allowedMembers = new Set(staff.map((item) => item.qywxUserId).filter((id): id is string => Boolean(id)))
    const members = followUsers.filter((member) => allowedMembers.has(member))
    matchedStaffCount = members.length
    const memberExternalIds = await mapWithConcurrency(members, 4, async (member) => ({
      member,
      externalIds: await listQywxExternalIdsByMember(member),
    }))
    const contactEntries = memberExternalIds.flatMap(({ member, externalIds }) => externalIds.map((id) => ({ id, member })))
    contacts = await mapWithConcurrency(contactEntries, 4, async ({ id, member }) => {
      const detail = await getQywxExternalDetail(id)
      return { external_userid: id, name: detail?.name || id, member, bound: boundExternalUserIds.has(id) }
    })
  } catch (error) {
    wecomError = error instanceof Error ? error.message : '读取企微联系人失败，请稍后重试'
  }

  return NextResponse.json({
    parents: parents.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      children: p.students.map((s) => s.name),
      students: p.students.map((student) => ({
        id: student.id,
        name: student.name,
        grade: student.termMemberships[0]?.grade ?? student.grade,
      })),
      qywxExternalUserId: p.qywxExternalUserId,
      qywxSenderUserId: p.qywxSenderUserId,
    })),
    contacts,
    staff,
    matchedStaffCount,
    wecomError,
  })
})

/** 绑定：家长账号 ↔ 企微学员（含发送成员） */
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') throw new AuthError('Unauthorized', 403)
  if (!qywxEnabled()) return NextResponse.json({ error: '企业微信通道未开启' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { userId?: string; externalUserId?: string; senderUserId?: string; termId?: string }
  if (!body.userId || !body.externalUserId || !body.senderUserId) {
    return NextResponse.json({ error: '缺少家长账号、外部联系人或发送成员' }, { status: 400 })
  }

  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user)
  const termId = typeof body.termId === 'string' ? body.termId.trim() : ''
  if (termId) {
    const term = await prisma.academicTerm.findFirst({ where: { id: termId, division }, select: { id: true } })
    if (!term) return NextResponse.json({ error: '所选批次不存在或不属于当前校区' }, { status: 404 })
  }
  const parent = await prisma.user.findFirst({
    where: {
      id: body.userId,
      role: 'parent',
      status: 'active',
      division,
      students: {
        some: {
          division,
          deletedAt: null,
          status: { notIn: ['INACTIVE', 'ARCHIVED'] },
          ...(termId ? {
            termMemberships: {
              some: { termId, status: { in: ['ACTIVE', 'COMPLETED'] } },
            },
          } : {}),
        },
      },
    },
    select: { id: true, qywxExternalUserId: true, qywxSenderUserId: true },
  })
  if (!parent) return NextResponse.json({ error: '家长账号不存在、已停用或不属于当前校区' }, { status: 404 })
  if (parent.qywxExternalUserId && (parent.qywxExternalUserId !== body.externalUserId || parent.qywxSenderUserId !== body.senderUserId)) {
    return NextResponse.json({ error: '该家长已绑定企微联系人，请先取消绑定后再重新关联' }, { status: 409 })
  }

  const memberContacts = await listQywxExternalIdsByMember(body.senderUserId)
  if (!memberContacts.includes(body.externalUserId)) {
    return NextResponse.json({ error: '该外部联系人不在所选企微发送成员的客户联系列表中' }, { status: 400 })
  }
  let contact: Awaited<ReturnType<typeof getQywxExternalDetail>>
  try {
    contact = await getQywxExternalDetail(body.externalUserId)
  } catch (error) {
    const detail = error instanceof Error ? error.message : '企微暂时无法核验该联系人'
    return NextResponse.json({ error: detail }, { status: 502 })
  }
  if (!contact) {
    return NextResponse.json({ error: '企微未返回该联系人的详情，暂不能安全绑定' }, { status: 502 })
  }
  if (contact.type !== 1) {
    return NextResponse.json({ error: '所选对象不是家长微信外部联系人' }, { status: 400 })
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const currentParent = await tx.user.findUnique({
        where: { id: parent.id },
        select: { qywxExternalUserId: true, qywxSenderUserId: true },
      })
      if (!currentParent) throw new Error('QYWX_PARENT_NOT_FOUND')
      if (currentParent.qywxExternalUserId && (currentParent.qywxExternalUserId !== body.externalUserId || currentParent.qywxSenderUserId !== body.senderUserId)) {
        throw new Error('QYWX_PARENT_ALREADY_BOUND')
      }
      const duplicate = await tx.user.findFirst({
        where: { qywxExternalUserId: body.externalUserId, id: { not: parent.id } },
        select: { id: true },
      })
      if (duplicate) throw new Error('QYWX_CONTACT_ALREADY_BOUND')
      const result = await tx.user.update({
        where: { id: parent.id },
        data: { qywxExternalUserId: body.externalUserId, qywxSenderUserId: body.senderUserId },
        select: { id: true, name: true, qywxExternalUserId: true, qywxSenderUserId: true },
      })
      await tx.notification.updateMany({
        where: { userId: parent.id, relatedType: 'CLASSROOM_FEEDBACK', pushStatus: 'no_bind', deletedAt: null },
        data: { pushStatus: 'queued', pushError: null, lastError: null },
      })
      return result
    }, { isolationLevel: 'Serializable' })
    return NextResponse.json({ ok: true, user: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'QYWX_PARENT_ALREADY_BOUND') {
      return NextResponse.json({ error: '该家长已绑定企微联系人，请先取消绑定后再重新关联' }, { status: 409 })
    }
    if (message === 'QYWX_CONTACT_ALREADY_BOUND' || (error as { code?: string })?.code === 'P2034') {
      return NextResponse.json({ error: '该企微联系人已关联其他家长账号，请先核对身份' }, { status: 409 })
    }
    throw error
  }
})

/** 解除绑定 */
export const DELETE = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') throw new AuthError('Unauthorized', 403)

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const termId = searchParams.get('termId')?.trim() || ''
  if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user)
  if (termId) {
    const term = await prisma.academicTerm.findFirst({ where: { id: termId, division }, select: { id: true } })
    if (!term) return NextResponse.json({ error: '所选批次不存在或不属于当前校区' }, { status: 404 })
  }
  const target = await prisma.user.findFirst({
    where: {
      id: userId,
      role: 'parent',
      status: 'active',
      division,
      ...(termId ? {
        students: {
          some: {
            division,
            deletedAt: null,
            status: { notIn: ['INACTIVE', 'ARCHIVED'] },
            termMemberships: {
              some: { termId, status: { in: ['ACTIVE', 'COMPLETED'] } },
            },
          },
        },
      } : {}),
    },
    select: { id: true },
  })
  if (!target) return NextResponse.json({ error: '家长账号不存在或不属于当前校区' }, { status: 404 })
  await prisma.user.update({ where: { id: target.id }, data: { qywxExternalUserId: null, qywxSenderUserId: null } })
  return NextResponse.json({ ok: true })
})
