import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardGuard({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role: string }).role
  if (role === 'parent') redirect('/parent/dashboard')
  return <>{children}</>
}
