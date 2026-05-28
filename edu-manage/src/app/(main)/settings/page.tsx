import { auth } from '@/lib/auth'
import { PageLayout } from '@/components/Layout/PageLayout'
import { SettingsContent } from './SettingsContent'

export default async function SettingsPage() {
  const session = await auth()
  const currentUserId = session?.user?.id || ''

  return (
    <PageLayout title="系统设置">
      <SettingsContent currentUserId={currentUserId} />
    </PageLayout>
  )
}
