import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const studentId = request.nextUrl.searchParams.get('studentId')?.trim()
  if (!studentId) return NextResponse.json({ error: '请提供学员 ID' }, { status: 400 })
  const prisma = await getRequestPrisma()
  const current = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, identityId: true, name: true, parentId: true, parentUserId: true, birthYear: true, gender: true },
  })
  if (!current) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  const parentOwnerIds = [...new Set([current.parentId, current.parentUserId].filter((id): id is string => Boolean(id)))]
  const candidates = parentOwnerIds.length
    ? await prisma.student.findMany({
        where: {
          OR: [{ parentId: { in: parentOwnerIds } }, { parentUserId: { in: parentOwnerIds } }],
          name: { equals: current.name, mode: 'insensitive' },
          identityId: { not: current.identityId },
        },
        select: {
          id: true, identityId: true, name: true, parentId: true, parentUserId: true, birthYear: true, gender: true, grade: true, status: true,
          termMemberships: { select: { grade: true, status: true, term: { select: { name: true, status: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    : []

  return NextResponse.json({ current, candidates }, { headers: { 'Cache-Control': 'private, no-store' } })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求内容不是有效 JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '请求内容格式无效' }, { status: 400 })
  const input = body as { canonicalStudentId?: unknown; studentIds?: unknown; confirmSameChild?: unknown }
  if (input.confirmSameChild !== true) return NextResponse.json({ error: '请明确确认这些档案属于同一名学员' }, { status: 400 })
  if (typeof input.canonicalStudentId !== 'string' || !input.canonicalStudentId.trim() || !Array.isArray(input.studentIds)) {
    return NextResponse.json({ error: '请提供主学员 ID 和待合并档案' }, { status: 400 })
  }

  const canonicalStudentId = input.canonicalStudentId.trim()
  const studentIds = [...new Set(input.studentIds.filter((id): id is string => typeof id === 'string').map((id) => id.trim()).filter(Boolean))]
  if (studentIds.length < 2 || studentIds.length > 50 || !studentIds.includes(canonicalStudentId)) {
    return NextResponse.json({ error: '至少选择两个档案（含主档案），最多 50 个' }, { status: 400 })
  }

  const prisma = await getRequestPrisma()
  const rows = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, identityId: true, name: true, parentId: true, parentUserId: true },
  })
  if (rows.length !== studentIds.length) return NextResponse.json({ error: '部分学员不存在或不属于当前学部' }, { status: 404 })
  const canonical = rows.find((row) => row.id === canonicalStudentId)
  const sharedOwners = new Set([canonical?.parentId, canonical?.parentUserId].filter((id): id is string => Boolean(id)))
  for (const row of rows) {
    for (const ownerId of [...sharedOwners]) {
      if (row.parentId !== ownerId && row.parentUserId !== ownerId) sharedOwners.delete(ownerId)
    }
  }
  if (!canonical || sharedOwners.size === 0) {
    return NextResponse.json({ error: '只允许合并同一已绑定家长名下的学员档案' }, { status: 409 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.student.updateMany({ where: { id: { in: studentIds } }, data: { identityId: canonical.identityId } })
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: '合并学员身份档案',
        detail: `将 ${studentIds.length} 条学员档案关联为同一名学员`,
        entityType: 'StudentIdentity',
        entityId: canonical.identityId,
        metadata: { canonicalStudentId, studentIds },
      },
    })
  })

  return NextResponse.json({ success: true, identityId: canonical.identityId, recordIds: studentIds })
})
