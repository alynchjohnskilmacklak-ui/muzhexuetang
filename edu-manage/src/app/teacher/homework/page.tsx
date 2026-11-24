import { requireTeacherPage } from '@/lib/teacher-portal'
import { TeacherHomeworkClient } from './client'

export default async function TeacherHomeworkPage() {
  await requireTeacherPage()
  return <TeacherHomeworkClient />
}
