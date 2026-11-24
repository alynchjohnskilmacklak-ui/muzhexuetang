import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getParentInteractionPayload } from '@/lib/parent-interaction'
import ParentInteractionClient from './client'

export const dynamic = 'force-dynamic'

export default async function ParentInteractionPage({
  searchParams,
}: {
  searchParams?: Promise<{ childId?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [params, prisma] = await Promise.all([searchParams, getRequestPrisma()])
  const userId = (session.user as { id: string }).id
  const initialData = await getParentInteractionPayload(prisma, userId, params?.childId)

  return <ParentInteractionClient initialData={initialData} initialChildId={params?.childId || ''} />
}
