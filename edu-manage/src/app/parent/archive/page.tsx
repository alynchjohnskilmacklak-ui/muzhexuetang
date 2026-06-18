import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getStudentProfile } from '@/lib/student-profile'
import { ParentArchiveClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentArchivePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id

  const prisma = await getRequestPrisma()

  const children = await prisma.student.findMany({
    where: { OR: [{ parentId: userId }, { parentUserId: userId }], status: { not: 'INACTIVE' } },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  const initial: { children: typeof children; activeStudentId: string | null; profile: Awaited<ReturnType<typeof getStudentProfile>> } = {
    children,
    activeStudentId: children[0]?.id || null,
    profile: null,
  }

  if (initial.activeStudentId) {
    const to = new Date()
    const from = new Date(to.getTime() - 180 * 86400000)
    initial.profile = await getStudentProfile(prisma, initial.activeStudentId, { from, to })
  }

  return <ParentArchiveClient initial={JSON.parse(JSON.stringify(initial))} />
}
