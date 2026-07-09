import { requireTeacherPage, teacherLessonWhere } from '@/lib/teacher-portal'
import { getRequestPrisma } from '@/lib/prisma'
import { startOfLocalDay } from '@/lib/meals'
import { getEffectiveMealMenuForDate } from '@/lib/meal-template'
import { TeacherMealsClient } from './client'

export const dynamic = 'force-dynamic'

export default async function TeacherMealsPage() {
  const teacher = await requireTeacherPage()
  const prisma = await getRequestPrisma()
  const today = startOfLocalDay(new Date())!
  const tomorrow = new Date(today.getTime() + 86400000)

  // Active groups for this teacher
  const groups = await prisma.classGroup.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      OR: [
        { teacherId: teacher.id },
        { teacherAssignments: { some: { teacherId: teacher.id } } },
      ],
    },
    include: {
      course: { select: { id: true, name: true, type: true } },
      classLessons: {
        where: {
          lessonDate: { gte: today, lt: tomorrow },
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
        },
        orderBy: { startTime: 'asc' },
        take: 1,
        select: { id: true, teacherId: true, startTime: true },
      },
      enrollments: {
        where: { status: 'ACTIVE' },
        include: { student: { select: { id: true, name: true, grade: true, school: true } } },
      },
    },
  })

  // Students already assigned to groups
  const groupedStudentIds = new Set<string>()
  const visibleGroups = groups.filter((group) => {
    if (group.course?.type !== 'GROUP') return true
    const firstLesson = group.classLessons[0]
    return Boolean(firstLesson && firstLesson.teacherId === teacher.id)
  })
  const mealGroups = visibleGroups.map(g => {
    const students = g.enrollments.map(e => {
      groupedStudentIds.add(e.student.id)
      return { id: e.student.id, name: e.student.name, grade: e.student.grade, school: e.student.school }
    })
    return {
      id: g.id,
      name: g.name,
      courseName: g.course?.name || '-',
      courseType: g.course?.type || 'GROUP',
      studentCount: students.length,
      students,
    }
  })

  // One-on-one students not in any group
  const oneOnOneStudents = await prisma.student.findMany({
    where: {
      id: { notIn: [...groupedStudentIds].length ? [...groupedStudentIds] as string[] : ['__none__'] },
      enrollments: {
        some: {
          status: 'ACTIVE',
          group: {
            status: { not: 'ARCHIVED' },
            OR: [
              { teacherId: teacher.id },
              { teacherAssignments: { some: { teacherId: teacher.id } } },
            ],
            course: { type: { in: ['ONE_ON_ONE', 'SMALL_GROUP'] } },
          },
        },
      },
    },
    select: { id: true, name: true, grade: true, school: true },
    distinct: ['id'],
  })

  if (oneOnOneStudents.length > 0) {
    const existingIds = new Set(mealGroups.flatMap(g => g.students.map(s => s.id)))
    const unassigned = oneOnOneStudents.filter(s => !existingIds.has(s.id))
    if (unassigned.length > 0) {
      mealGroups.push({ id: '_other', name: '其他学员', courseName: '一对一/散课', courseType: 'ONE_ON_ONE', studentCount: unassigned.length, students: unassigned })
    }
  }

  const [menu, report] = await Promise.all([
    getEffectiveMealMenuForDate(today),
    prisma.mealReport.findFirst({
      where: { teacherId: teacher.id, reportDate: today },
    }),
  ])

  return (
    <TeacherMealsClient
      menu={menu ? JSON.parse(JSON.stringify(menu)) : null}
      mealGroups={JSON.parse(JSON.stringify(mealGroups))}
      report={report ? JSON.parse(JSON.stringify(report)) : null}
      reportDate={today.toISOString()}
    />
  )
}
