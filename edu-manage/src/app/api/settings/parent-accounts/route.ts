import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
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


  const prisma = await getRequestPrisma()
  const accounts = await prisma.user.findMany({
    where: { role: 'parent', status: { not: 'deleted' } },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      students: {
        where: { status: { not: 'INACTIVE' } },
        select: { id: true, name: true, grade: true, status: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ accounts })
})
