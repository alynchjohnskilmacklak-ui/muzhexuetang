import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { getRequestPrisma } from '@/lib/prisma'
import { getParentChildren } from '@/lib/parent-children'
import { resolveParentChildRequest } from '@/lib/parent-child-selection'
import { PARENT_ACTIVE_CHILD_COOKIE } from '@/constants/membership'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const prisma = await getRequestPrisma()
  const children = await getParentChildren(prisma, session.user.id)
  const requestedId = request.nextUrl.searchParams.get('childId')
  const rememberedId = request.cookies.get(PARENT_ACTIVE_CHILD_COOKIE)?.value || null
  const { selected, invalidChild } = resolveParentChildRequest(children, requestedId, rememberedId)

  return NextResponse.json({
    children: children.map(({ id, name, grade, membershipLevel }) => ({ id, name, grade, membershipLevel })),
    activeChildId: selected?.id || '',
    invalidChild,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
})
