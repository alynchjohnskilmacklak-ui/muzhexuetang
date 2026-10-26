import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { PARENT_ACTIVE_CHILD_COOKIE } from '@/constants/membership'
import { resolveParentChildId } from '@/lib/parent-child-selection'
import { getRequestPrisma } from '@/lib/prisma'
import { ParentMessagesClient } from './client'
import { activeEnrollmentWhere, visibleClassLessonWhere } from '@/lib/business-visibility'
import { getParentChildren } from '@/lib/parent-children'

export const dynamic = 'force-dynamic'

export default async function ParentMessagesPage({ searchParams }: { searchParams?: Promise<{ childId?: string; studentId?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const db = await getRequestPrisma()
  const params = await searchParams

  const students = await getParentChildren(db, userId)
  const rememberedChildId = (await cookies()).get(PARENT_ACTIVE_CHILD_COOKIE)?.value
  const initialActiveChildId = resolveParentChildId(students, [params?.childId, params?.studentId, rememberedChildId])

  const teacherRecommendations = Object.fromEntries(await Promise.all(students.map(async (student) => {
    const [recentLesson, enrollments] = await Promise.all([
      db.classLesson.findFirst({
        where: {
          ...visibleClassLessonWhere,
          group: { ...visibleClassLessonWhere.group, enrollments: { some: { ...activeEnrollmentWhere, studentId: { in: student.recordIds } } } },
        },
        orderBy: [{ lessonDate: 'desc' }, { startTime: 'desc' }],
        select: {
          subject: true,
          teacher: { select: { id: true, name: true, avatar: true, tierLevel: true, subjects: true, gender: true } },
          group: {
            select: {
              teacher: { select: { id: true, name: true, avatar: true, tierLevel: true, subjects: true, gender: true } },
              course: { select: { subject: true } },
              teacherAssignments: { select: { subject: true, teacher: { select: { id: true, name: true, avatar: true, tierLevel: true, subjects: true, gender: true } } } },
            },
          },
        },
      }),
      db.enrollment.findMany({
        where: { ...activeEnrollmentWhere, studentId: { in: student.recordIds } },
        orderBy: { enrolledAt: 'desc' },
        select: {
          group: {
            select: {
              teacher: { select: { id: true, name: true, avatar: true, tierLevel: true, subjects: true, gender: true } },
              course: { select: { subject: true } },
              teacherAssignments: { select: { subject: true, teacher: { select: { id: true, name: true, avatar: true, tierLevel: true, subjects: true, gender: true } } } },
            },
          },
        },
      }),
    ])

    type TeacherInfo = { id: string; name: string; subject: string | null; source: 'lesson' | 'group'; avatar?: string | null; tierLevel?: string | null; subjects?: string | null; gender?: string | null }
    const candidates: TeacherInfo[] = []
    const add = (teacher: { id: string; name: string; avatar?: string | null; tierLevel?: string | null; subjects?: string | null; gender?: string | null } | null | undefined, subject: string | null | undefined, source: 'lesson' | 'group') => {
      if (!teacher || candidates.some((candidate) => candidate.id === teacher.id)) return
      candidates.push({ id: teacher.id, name: teacher.name, subject: subject || null, source, avatar: teacher.avatar, tierLevel: teacher.tierLevel, subjects: teacher.subjects, gender: teacher.gender })
    }
    if (recentLesson) {
      const directTeacher = recentLesson.teacher || recentLesson.group.teacher
      const directAssignment = recentLesson.group.teacherAssignments.find((assignment) => assignment.teacher.id === directTeacher?.id)
      add(directTeacher, recentLesson.subject || directAssignment?.subject || recentLesson.group.course.subject, 'lesson')
      for (const assignment of recentLesson.group.teacherAssignments) add(assignment.teacher, assignment.subject || recentLesson.group.course.subject, 'lesson')
    }
    for (const enrollment of enrollments) {
      for (const assignment of enrollment.group.teacherAssignments) add(assignment.teacher, assignment.subject || enrollment.group.course.subject, 'group')
      add(enrollment.group.teacher, enrollment.group.course.subject, 'group')
    }
    return [student.id, candidates] as const
  })))

  const messages = await db.parentMessage.findMany({
    where: { parentId: userId },
    include: {
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true, avatar: true, gender: true } },
      replies: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  return (
    <ParentMessagesClient
      students={students}
      initialActiveChildId={initialActiveChildId}
      teacherRecommendations={teacherRecommendations}
      initialMessages={JSON.parse(JSON.stringify(messages))}
    />
  )
}
