import { ScheduleWorkbench } from './workbench'

type PageProps = {
  searchParams: Promise<{ groupId?: string; action?: string; date?: string }>
}

export default async function ScheduleWorkbenchPage({ searchParams }: PageProps) {
  const params = await searchParams
  return <ScheduleWorkbench initialGroupId={params.groupId} initialAction={params.action} initialDate={params.date} />
}
