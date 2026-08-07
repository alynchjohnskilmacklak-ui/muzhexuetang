import { GrowthReportClient } from './client'

export default async function ParentStudentGrowthReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <GrowthReportClient studentId={id} />
}

