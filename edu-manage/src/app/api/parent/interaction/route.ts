import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireParentUser } from '@/lib/auth/guards'
import { getParentInteractionPayload } from '@/lib/parent-interaction'

export const dynamic = 'force-dynamic'

/** 家长端只读取自己孩子的近期课堂互动记录。 */
export const GET = apiHandler(async (request: NextRequest) => {
  const ctx = await requireParentUser()
  const childId = request.nextUrl.searchParams.get('childId')
  const payload = await getParentInteractionPayload(ctx.prisma, ctx.id, childId)
  if (payload.error) return NextResponse.json({ error: payload.error }, { status: 403 })
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } })
})
