import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ParentDashboardClient } from './client'
import { getParentDashboardData } from '@/lib/parent-dashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ParentDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id
  const data = await getParentDashboardData(userId)

  return <ParentDashboardClient {...JSON.parse(JSON.stringify(data))} />
}
