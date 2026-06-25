import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { BindWxClient } from './client'

export const dynamic = 'force-dynamic'

export default async function BindPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const db = await getRequestPrisma()
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { wxpusherUid: true, name: true },
  })
  return <BindWxClient bound={!!user?.wxpusherUid} userName={user?.name || ''} />
}
