import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  if (!['admin', 'teacher'].includes(role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { orderedIds } = await req.json()
  if (!Array.isArray(orderedIds)) return NextResponse.json({ error: 'orderedIds 必须是数组' }, { status: 400 })
  await prisma.$transaction(
    orderedIds
      .filter((id): id is string => typeof id === 'string')
      .map((id, index) => prisma.guideStep.update({ where: { id }, data: { order: index + 1 } }))
  )
  revalidatePath('/volunteer')
  revalidatePath('/parent/volunteer')
  return NextResponse.json({ success: true })
})
