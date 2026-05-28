import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'teacher'].includes(role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.guideDocument.delete({ where: { id } })
  revalidatePath('/volunteer')
  revalidatePath('/parent/volunteer')
  return NextResponse.json({ success: true })
}
