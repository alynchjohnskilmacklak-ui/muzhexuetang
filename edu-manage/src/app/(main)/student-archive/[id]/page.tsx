import { StudentArchiveDetailClient } from './client'

export const dynamic = 'force-dynamic'

export default async function StudentArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StudentArchiveDetailClient studentId={id} />
}
