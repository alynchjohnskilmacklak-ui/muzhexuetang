import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentTeachersClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentTeachersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const db = await getRequestPrisma()
  const teachers = await db.teacher.findMany({
    where: { status: { not: 'RESIGNED' } },
    select: {
      id: true,
      name: true,
      gender: true,
      avatar: true,
      education: true,
      university: true,
      major: true,
      graduationYear: true,
      currentUnit: true,
      subjects: true,
      bio: true,
      employmentType: true,
      tierLevel: true,
      rating: true,
      ratingCount: true,
      studyMaterials: {
        where: {
          status: 'PUBLISHED',
          audience: { in: ['STUDENT', 'BOTH'] },
        },
        select: {
          id: true,
          title: true,
          grade: true,
          subject: true,
          fileType: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      _count: { select: { students: true, classGroups: true } },
    },
    orderBy: [{ employmentType: 'asc' }, { createdAt: 'desc' }],
  })

  const tierOrder: Record<string, number> = { SENIOR: 0, EXPERIENCED: 1, NEW: 2 }
  const sortedTeachers = [...teachers].sort((a, b) => (tierOrder[a.tierLevel] ?? 2) - (tierOrder[b.tierLevel] ?? 2))

  return <ParentTeachersClient teachers={JSON.parse(JSON.stringify(sortedTeachers))} />
}
