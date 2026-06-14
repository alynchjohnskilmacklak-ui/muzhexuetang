import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MainLayout } from '@/components/Layout/MainLayout'
import { DivisionProvider } from '@/contexts/DivisionContext'

export default async function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role: string }).role
  if (role === 'teacher') redirect('/teacher')
  if (role === 'parent') redirect('/parent')
  return (
    <DivisionProvider>
      <MainLayout>{children}</MainLayout>
    </DivisionProvider>
  )
}
