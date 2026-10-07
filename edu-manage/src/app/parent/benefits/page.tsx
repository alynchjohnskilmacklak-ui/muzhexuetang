import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { DEFAULT_MEMBERSHIP_BENEFITS } from '@/data/membership-benefits-default'
import { BenefitsClient } from './client'
import { getParentPortalTheme } from '@/lib/parent-portal-theme'

export const dynamic = 'force-dynamic'

export default async function ParentBenefitsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id
  const prisma = await getRequestPrisma()
  const [config, selectedChild] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { id: 'singleton' }, select: { membershipBenefits: true } }),
    getParentPortalTheme(userId),
  ])

  return (
    <BenefitsClient
      content={config?.membershipBenefits?.trim() || DEFAULT_MEMBERSHIP_BENEFITS}
      studentName={selectedChild.studentName}
      membershipLevel={selectedChild.membershipLevel}
    />
  )
}
