import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentTeachersClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentTeachersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const teachers = await prisma.teacher.findMany({
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

  return <ParentTeachersClient teachers={JSON.parse(JSON.stringify(teachers))} />
}
