import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function ParentGrowthPage({ searchParams }: { searchParams: Promise<{ feedbackId?: string; postId?: string }> }) {
  return searchParams.then(sp => {
    if (sp.feedbackId) redirect(`/parent/class-feedback/${sp.feedbackId}`)
    if (sp.postId) redirect(`/parent/archive`)
    redirect('/parent/archive')
  })
}
