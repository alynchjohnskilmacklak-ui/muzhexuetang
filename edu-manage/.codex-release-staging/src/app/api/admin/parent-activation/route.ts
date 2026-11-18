import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { issueParentActivationToken } from '@/lib/parent-activation'
import { resolvePublicOrigin } from '@/lib/public-origin'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const admin = await requireAdminUser()
  const accounts = await admin.prisma.user.findMany({
    where: { role: 'parent', division: admin.division, status: { not: 'deleted' } },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      lastLoginAt: true,
      students: {
        where: { status: { not: 'ARCHIVED' } },
        select: { id: true, name: true, grade: true },
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
  return NextResponse.json({ accounts })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const body = await request.json()
  const parentUserId = typeof body.parentUserId === 'string' ? body.parentUserId : ''
  try {
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
