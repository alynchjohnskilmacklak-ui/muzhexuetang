import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  return user?.id && user.role === 'admin' ? user : null
}

export const GET = apiHandler(async () => {
  const currentUser = await requireAdmin()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const accounts = await prisma.user.findMany({
    where: { role: 'parent' },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ accounts })
})
