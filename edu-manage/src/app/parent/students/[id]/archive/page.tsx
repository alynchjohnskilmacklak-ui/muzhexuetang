import { auth } from '@/lib/auth'
import { getPrismaForDivision } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentArchiveClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentStudentArchivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id
  const division = ((session.user as { division?: string }).division === 'SENIOR' ? 'SENIOR' : 'JUNIOR') as 'JUNIOR' | 'SENIOR'
  const prisma = getPrismaForDivision(division)

  // Verify parent owns this student
  const student = await prisma.student.findFirst({
    where: { id: studentId, parentUserId: userId, status: { not: 'INACTIVE' } },
    select: { id: true, name: true, grade: true, school: true },
  })
  if (!student) redirect('/parent/profile')

  return <ParentArchiveClient studentId={studentId} studentName={student.name} />
}
