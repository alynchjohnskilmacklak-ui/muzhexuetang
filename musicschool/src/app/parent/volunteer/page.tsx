import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getVolunteerGuideForParent } from '@/lib/volunteer'
import VolunteerClient from './client'

export const dynamic = 'force-dynamic'

export default async function ParentVolunteerPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const guide = await getVolunteerGuideForParent()

  return (
    <VolunteerClient guide={JSON.parse(JSON.stringify(guide))} />
  )
}
