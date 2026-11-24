import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { issueParentActivationToken } from '@/lib/parent-activation'
import { resolvePublicOrigin } from '@/lib/public-origin'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const termId = request.nextUrl.searchParams.get('termId')?.trim() || null
  const term = termId
    ? await admin.prisma.academicTerm.findFirst({
      where: { id: termId, division: admin.division },
      select: { id: true },
    })
    : null
  if (termId && !term) {
    return NextResponse.json({ error: '所选批次不存在或不属于当前校区' }, { status: 404 })
  }

  const batchStudentWhere: Prisma.StudentWhereInput = {
    division: admin.division,
    deletedAt: null,
    status: { notIn: ['INACTIVE', 'ARCHIVED'] },
    ...(termId ? {
      termMemberships: {
        some: { termId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      },
    } : {}),
  }

  const accounts = await admin.prisma.user.findMany({
    where: {
      role: 'parent',
      division: admin.division,
      status: { not: 'deleted' },
      ...(termId ? { students: { some: batchStudentWhere } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      lastLoginAt: true,
      qywxExternalUserId: true,
      students: {
        where: batchStudentWhere,
        select: {
          id: true,
          name: true,
          grade: true,
          termMemberships: {
            where: termId ? { termId, status: { in: ['ACTIVE', 'COMPLETED'] } } : {},
            select: { grade: true },
            orderBy: { joinedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
      },
      activationTokens: {
        where: { usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { expiresAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ lastLoginAt: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json({
    accounts: accounts.map((account) => ({
      ...account,
      students: account.students.map((student) => ({
        id: student.id,
        name: student.name,
        grade: student.termMemberships[0]?.grade ?? student.grade,
      })),
    })),
    selectedTermId: termId,
  })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const body = await request.json()
  const parentUserId = typeof body.parentUserId === 'string' ? body.parentUserId : ''
  const termId = typeof body.termId === 'string' ? body.termId.trim() : ''
  try {
    if (termId) {
      const term = await admin.prisma.academicTerm.findFirst({
        where: { id: termId, division: admin.division },
        select: { id: true },
      })
      if (!term) return NextResponse.json({ error: '所选批次不存在或不属于当前校区' }, { status: 404 })
      const parent = await admin.prisma.user.findFirst({
        where: {
          id: parentUserId,
          role: 'parent',
          division: admin.division,
          status: { not: 'deleted' },
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
        },
        select: { id: true },
      })
      if (!parent) return NextResponse.json({ error: '该家长不属于所选批次或账号不存在' }, { status: 404 })
    } else {
      const parent = await admin.prisma.user.findFirst({
        where: { id: parentUserId, role: 'parent', division: admin.division, status: { not: 'deleted' } },
        select: { id: true },
      })
      if (!parent) return NextResponse.json({ error: '家长账号不存在或不属于当前校区' }, { status: 404 })
    }
    const origin = resolvePublicOrigin(request)
    const issued = await issueParentActivationToken(admin.prisma, { parentUserId, createdById: admin.id })
    return NextResponse.json({
      activationUrl: `${origin}/activate/${issued.token}`,
      expiresAt: issued.expiresAt,
      parent: issued.parent,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '生成失败' }, { status: 400 })
  }
})
