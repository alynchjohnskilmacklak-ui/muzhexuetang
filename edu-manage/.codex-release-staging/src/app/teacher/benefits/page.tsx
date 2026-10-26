import { getRequestPrisma } from '@/lib/prisma'
import { requireTeacherPage } from '@/lib/teacher-portal'
import { DEFAULT_TEACHER_BENEFITS } from '@/data/teacher-benefits-default'
import { TeacherBenefitsClient } from './client'

export const dynamic = 'force-dynamic'

export default async function TeacherBenefitsPage() {
  const teacher = await requireTeacherPage()
  const prisma = await getRequestPrisma()
  const config = await prisma.systemConfig.findUnique({
    where: { id: 'singleton' },
    select: { teacherBenefits: true },
  })

  return (
    <TeacherBenefitsClient
      content={config?.teacherBenefits?.trim() || DEFAULT_TEACHER_BENEFITS}
      teacherName={teacher.name}
      tierLevel={teacher.tierLevel}
    />
  )
}
