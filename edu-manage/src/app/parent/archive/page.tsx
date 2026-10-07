import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { StudentProfile } from '@/lib/student-profile'
import { ParentArchiveClient } from './client'
import { getParentChildren } from '@/lib/parent-children'

export const dynamic = 'force-dynamic'

export default async function ParentArchivePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id

  const prisma = await getRequestPrisma()

  const children = await getParentChildren(prisma, userId)

  // Render the route after the lightweight child list; the detailed profile loads in parallel on the client.
  const initial: { children: typeof children; activeStudentId: string | null; profile: StudentProfile | null; parentId: string } = {
    children,
    activeStudentId: children[0]?.id || null,
    profile: null,
    parentId: userId,
  }

  return <ParentArchiveClient initial={JSON.parse(JSON.stringify(initial))} />
}
