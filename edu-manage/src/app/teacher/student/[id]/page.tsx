import { redirect } from 'next/navigation'
import { requireTeacherPage, assertTeacherOwnsStudent } from '@/lib/teacher-portal'
import { getRequestPrisma } from '@/lib/prisma'
import { TeacherStudentWorkbenchClient } from './client'

export const dynamic = 'force-dynamic'

export default async function TeacherStudentWorkbenchPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacherPage()
  const { id } = await params
  const prisma = await getRequestPrisma()
  const student = await assertTeacherOwnsStudent(teacher.id, id, prisma)
  if (!student) redirect('/teacher/students')

  return <TeacherStudentWorkbenchClient studentId={student.id} studentName={student.name} teacherId={teacher.id} />
}
