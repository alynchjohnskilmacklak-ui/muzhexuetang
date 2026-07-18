import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRequestPrisma } from '@/lib/prisma'
import { ParentMessagesClient } from './client'
import { parentActiveStudentWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ParentMessagesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const db = await getRequestPrisma()

  const students = await db.student.findMany({
    where: parentActiveStudentWhere(userId),
    select: { id: true, name: true, grade: true },
  })

  const messages = await db.parentMessage.findMany({
    where: { parentId: userId },
    include: {
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      replies: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  return (
    <ParentMessagesClient
      students={students}
      initialMessages={JSON.parse(JSON.stringify(messages))}
    />
  )
}
