import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { VolunteerGuide } from '@/components/Volunteer/VolunteerGuide'

export const dynamic = 'force-dynamic'

export default async function ParentVolunteerGuidePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return <VolunteerGuide />
}
