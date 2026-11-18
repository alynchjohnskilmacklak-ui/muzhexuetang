import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentFeesClient } from './client'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { cookies } from 'next/headers'
import { PARENT_ACTIVE_CHILD_COOKIE } from '@/constants/membership'

export const dynamic = 'force-dynamic'

export default async function ParentFeesPage({ searchParams }: { searchParams?: Promise<{ childId?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const db = await getRequestPrisma()
  const userId = (session.user as { id: string }).id
  const params = await searchParams
  const children = await getParentChildren(db, userId)
  const remembered = (await cookies()).get(PARENT_ACTIVE_CHILD_COOKIE)?.value
  const requested = params?.childId
  const child = findParentChild(children, requested || remembered || null)
  if (requested && requested !== 'all' && !child) redirect('/parent/fees')
  const activeChild = requested === 'all' ? null : child || children[0] || null
  const studentWhere = { ...parentLinkedStudentWhere(userId), id: { in: activeChild?.recordIds || children.flatMap((item) => item.recordIds) } }

  const fees = await db.fee.findMany({
    where: { deletedAt: null, student: studentWhere, OR: [{ courseId: null }, { course: { isActive: true } }] },
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


  return (
    <ParentFeesClient
      feeData={feeData}
      linkedChildren={children}
      activeChildId={activeChild?.id || 'all'}
      totalPaid={totalPaid}
      totalPending={totalPending}
    />
  )
}
