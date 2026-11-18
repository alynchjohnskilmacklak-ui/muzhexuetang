import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ArchiveEntryClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ArchiveEntryPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return <ArchiveEntryClient />
}
