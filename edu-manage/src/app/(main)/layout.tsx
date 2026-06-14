import { MainLayout } from '@/components/Layout/MainLayout'
import { DivisionProvider } from '@/contexts/DivisionContext'

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DivisionProvider>
      <MainLayout>{children}</MainLayout>
    </DivisionProvider>
  )
}
