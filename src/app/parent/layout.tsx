import { ParentLayout } from '@/components/Layout/ParentLayout'

export default function ParentRouteLayout({ children }: { children: React.ReactNode }) {
  return <ParentLayout>{children}</ParentLayout>
}
