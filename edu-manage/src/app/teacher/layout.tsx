import { TeacherLayout } from '@/components/Layout/TeacherLayout'
import { AIFloatingLauncher } from '@/components/AI/AIFloatingLauncher'
import { requireTeacherPage } from '@/lib/teacher-portal'

export default async function TeacherRouteLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacherPage()
  return (
    <TeacherLayout initialData={{
      teacher: { id: teacher.id, name: teacher.name, avatar: teacher.avatar || undefined, tierLevel: teacher.tierLevel },
      badges: { unsubmitted: 0, unpublished: 0, unread: 0, unreadMessages: 0 },
    }}>
      {children}
      <AIFloatingLauncher />
    </TeacherLayout>
  )
}
