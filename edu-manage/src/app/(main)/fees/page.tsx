import { PageLayout } from '@/components/Layout/PageLayout'
import { FeesClient } from './client'

export const dynamic = 'force-dynamic'

export default function FeesPage() {
  return (
    <PageLayout title="收费管理" subtitle="纯管理端手动收费台账，不推送家长">
      <FeesClient />
    </PageLayout>
  )
}
