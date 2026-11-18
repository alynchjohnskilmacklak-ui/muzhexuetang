import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ParentProviders } from './providers'
import { ParentLayout } from '@/components/Layout/ParentLayout'
import { AIFloatingLauncher } from '@/components/AI/AIFloatingLauncher'
import { AuthError, requireParentUser } from '@/lib/auth/guards'
import { PARENT_TERM_EXPIRED_CODE, PARENT_TERM_EXPIRED_MESSAGE } from '@/lib/parent-account-validity'
import { getParentPortalTheme } from '@/lib/parent-portal-theme'

export default async function ParentRouteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role: string }).role
  if (role === 'admin' || role === 'teacher') redirect('/dashboard')
  let parentId: string
  try {
    const parent = await requireParentUser()
    parentId = parent.id
  } catch (error) {
    if (error instanceof AuthError && error.message === PARENT_TERM_EXPIRED_MESSAGE) {
      redirect(`/login?error=${PARENT_TERM_EXPIRED_CODE}`)
    }
    redirect('/login')
  }
  const initialTheme = await getParentPortalTheme(parentId)
  return (
    <ParentProviders>
      <ParentLayout initialMembershipLevel={initialTheme.membershipLevel}>{children}</ParentLayout>
      <AIFloatingLauncher />
    </ParentProviders>
  )
}
