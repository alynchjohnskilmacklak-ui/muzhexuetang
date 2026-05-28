import { TeacherLayout } from '@/components/Layout/TeacherLayout'
import { requireTeacherPage } from '@/lib/teacher-portal'

export default async function TeacherRouteLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacherPage()
  return (
    <TeacherLayout initialData={{
      teacher: { id: teacher.id, name: teacher.name, avatar: teacher.avatar || undefined },
      badges: { unsubmitted: 0, unpublished: 0, unread: 0 },
    }}>
      {children}
    </TeacherLayout>
  )
}
