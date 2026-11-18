import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const POST = apiHandler(async () => {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }


  const prisma = await getRequestPrisma()
  await prisma.user.update({
    where: { id: user.id },
    data: { wxpusherUid: null },
  })

  return NextResponse.json({ success: true })
})
