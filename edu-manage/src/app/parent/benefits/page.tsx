import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { DEFAULT_MEMBERSHIP_BENEFITS } from '@/data/membership-benefits-default'
import { BenefitsClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentBenefitsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id
  const prisma = await getRequestPrisma()
  const [config, student] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { id: 'singleton' }, select: { membershipBenefits: true } }),
    prisma.student.findFirst({
      where: { OR: [{ parentId: userId }, { parentUserId: userId }], status: { not: 'INACTIVE' } },
      select: { id: true, name: true, membershipLevel: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return (
    <BenefitsClient
      content={config?.membershipBenefits?.trim() || DEFAULT_MEMBERSHIP_BENEFITS}
      studentName={student?.name || ''}
      membershipLevel={student?.membershipLevel || 'NORMAL'}
    />
  )
}
