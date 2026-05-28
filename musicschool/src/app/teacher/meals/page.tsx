import { prisma } from '@/lib/prisma'
import { requireTeacherPage, teacherStudentWhere } from '@/lib/teacher-portal'
import { startOfLocalDay } from '@/lib/meals'
import { getEffectiveMealMenuForDate } from '@/lib/meal-template'
import { TeacherMealsClient } from './client'

export const dynamic = 'force-dynamic'

export default async function TeacherMealsPage() {
  const teacher = await requireTeacherPage()
  const today = startOfLocalDay(new Date())!

  const [menu, students] = await Promise.all([
    getEffectiveMealMenuForDate(today),
    prisma.student.findMany({
      where: teacherStudentWhere(teacher.id),
      select: { id: true, name: true, grade: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const report = menu
    ? await prisma.mealReport.findUnique({
        where: { menuId_teacherId_reportDate: { menuId: menu.id, teacherId: teacher.id, reportDate: today } },
      })
    : null

  return (
    <TeacherMealsClient
      menu={menu ? JSON.parse(JSON.stringify(menu)) : null}
      myStudents={students}
      report={report ? JSON.parse(JSON.stringify(report)) : null}
      reportDate={today.toISOString()}
    />
  )
}
