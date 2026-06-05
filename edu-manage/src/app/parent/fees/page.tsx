import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentFeesClient } from './client'
import { parentActiveStudentWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ParentFeesPage({ searchParams }: { searchParams?: Promise<{ childId?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id
  const params = await searchParams
  const childId = params?.childId || ''
  const studentWhere = childId
    ? { ...parentActiveStudentWhere(userId), id: childId }
    : parentActiveStudentWhere(userId)

  const fees = await prisma.fee.findMany({
    where: { student: studentWhere, OR: [{ courseId: null }, { course: { isActive: true } }] },
    include: { student: true, course: true },
    orderBy: { createdAt: 'desc' },
  })

  const feeData = fees.map(f => ({
    key: f.id,
    id: f.id,
    student: f.student.name,
    course: f.course?.name || '',
    amount: f.amount,
    type: f.type,
    status: f.status,
    date: f.createdAt.toISOString().split('T')[0],
    paidAt: f.paidAt ? f.paidAt.toISOString().split('T')[0] : null,
  }))

  const totalPaid = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  const totalPending = fees.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0)

  const studentNames = [...new Set(fees.map(f => f.student.name))]

  return (
    <ParentFeesClient
      feeData={feeData}
      studentNames={studentNames}
      totalPaid={totalPaid}
      totalPending={totalPending}
    />
  )
}
