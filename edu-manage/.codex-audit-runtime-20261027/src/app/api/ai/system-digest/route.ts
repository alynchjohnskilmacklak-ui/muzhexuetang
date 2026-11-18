import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { buildSystemDigest } from '@/lib/ai/system-context'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const prisma = await getRequestPrisma()
  const digest = await buildSystemDigest(user, prisma)
  return NextResponse.json(digest, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
})
