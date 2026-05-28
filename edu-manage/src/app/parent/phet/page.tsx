import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PhETSimulator } from '@/components/PhET/PhETSimulator'

export const dynamic = 'force-dynamic'

export default async function PhETParentPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return (
    <div>
      <PhETSimulator />
    </div>
  )
}
