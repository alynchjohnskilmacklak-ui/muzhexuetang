import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ParentProviders } from './providers'
import { ParentLayout } from '@/components/Layout/ParentLayout'

export default async function ParentRouteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role: string }).role
  if (role === 'admin' || role === 'teacher') redirect('/dashboard')
  return (
    <ParentProviders>
      <ParentLayout>{children}</ParentLayout>
    </ParentProviders>
  )
}
