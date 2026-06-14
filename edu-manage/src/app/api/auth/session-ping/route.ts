import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  const user = session?.user as { id?: string; sessionMark?: string } | undefined

  if (!user?.id) {
    return NextResponse.json({ status: 'unauthenticated' }, { status: 401 })
  }


  const prisma = await getRequestPrisma()
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentSessionToken: true, status: true },
  })

  if (!dbUser) {
    return NextResponse.json({ status: 'not_found' }, { status: 401 })
  }
  if (dbUser.status === 'disabled') {
    return NextResponse.json({ status: 'disabled' }, { status: 403 })
  }
  if (
    dbUser.currentSessionToken
    && user.sessionMark
    && dbUser.currentSessionToken !== user.sessionMark
  ) {
    return NextResponse.json({ status: 'kicked' }, { status: 401 })
  }

  return NextResponse.json({ status: 'ok' })
})
