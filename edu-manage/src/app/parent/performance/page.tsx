import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import PerformanceClient from './client'
import { parentActiveStudentWhere, parentVisiblePerformancePostWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ParentPerformancePage({ searchParams }: { searchParams?: Promise<{ childId?: string }> }) {
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) redirect('/login')
  const db = await getRequestPrisma()
  const params = await searchParams
  const childId = params?.childId || ''

  const studentWhere = childId
    ? { ...parentActiveStudentWhere(userId), id: childId }
    : parentActiveStudentWhere(userId)

  const student = await db.student.findFirst({
    where: studentWhere,
    include: {
      mainTeacher: { select: { id: true, name: true } },
      achievementBadges: { include: { teacher: { select: { name: true } } }, orderBy: { earnedAt: 'desc' } },
    },
  })

  if (!student) {
    return <PerformanceClient student={null} initialPosts={[]} />
  }

  const initialPosts = await db.performancePost.findMany({
    where: { ...parentVisiblePerformancePostWhere(userId), studentId: student.id },
    include: {
      teacher: { select: { id: true, name: true, avatar: true } },
      reactions: true,
      comments: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
      badges: true,
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 10,
  })

  return <PerformanceClient student={JSON.parse(JSON.stringify(student))} initialPosts={JSON.parse(JSON.stringify(initialPosts))} />
}
