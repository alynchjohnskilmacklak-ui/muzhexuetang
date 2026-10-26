import { redirect } from 'next/navigation'

export default function TeacherStudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => redirect(`/teacher/student/${id}`))
}
