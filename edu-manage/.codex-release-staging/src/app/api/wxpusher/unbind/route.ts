import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const POST = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const userId = (session.user as { id: string }).id
  await prisma.user.update({
    where: { id: userId },
    data: { wxpusherUid: null },
  })

  return NextResponse.json({ success: true })
})
