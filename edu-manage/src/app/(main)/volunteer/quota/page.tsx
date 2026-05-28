import { PageLayout } from '@/components/Layout/PageLayout'
import { QuotaManager } from '../_components/QuotaManager'

export default function VolunteerQuotaPage() {
  return (
    <PageLayout title="分配生名额表" subtitle="导入、查询和维护石家庄分配生计划数据">
      <QuotaManager />
    </PageLayout>
  )
}
