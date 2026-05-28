import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  const role = (session.user as { role: string }).role
  if (role === 'parent') redirect('/parent/dashboard')
  if (role === 'teacher') redirect('/teacher/dashboard')
  redirect('/dashboard')
}
