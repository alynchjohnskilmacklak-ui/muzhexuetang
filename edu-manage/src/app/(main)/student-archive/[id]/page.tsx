import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function StudentArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/students/${encodeURIComponent(id)}#learning`)
}
