import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TeacherMessagesClient } from './client'

export const dynamic = 'force-dynamic'

export default async function TeacherMessagesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const user = session.user as { role: string }
  if (user.role !== 'teacher') redirect('/dashboard')
  return <TeacherMessagesClient />
}
