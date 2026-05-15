import { MainLayout } from '@/components/Layout/MainLayout'

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}
