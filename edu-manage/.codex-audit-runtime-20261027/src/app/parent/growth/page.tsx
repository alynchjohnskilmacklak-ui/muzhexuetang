import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function GrowthRedirect({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const qs = new URLSearchParams(sp).toString()
  redirect(`/parent/archive${qs ? `?${qs}` : ''}`)
}
