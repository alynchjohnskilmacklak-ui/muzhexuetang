import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { PARENT_ACTIVE_CHILD_COOKIE } from '@/constants/membership'
import { resolveParentChildId } from '@/lib/parent-child-selection'
import { visibleClassLessonWhere } from '@/lib/business-visibility'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { calculateIntensiveDeductHours } from '@/lib/intensive-class'
import { IntensiveDetailView } from '@/components/Parent/IntensiveDetailView'

export const dynamic = 'force-dynamic'

export default async function ParentIntensivePage({
  searchParams,
}: {
  searchParams?: Promise<{ groupId?: string; studentId?: string; childId?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id
  const params = await searchParams
  const groupId = typeof params?.groupId === 'string' ? params.groupId : ''
  const requestedStudentId = typeof params?.studentId === 'string' ? params.studentId : ''
  const db = await getRequestPrisma()

  const students = await getParentChildren(db, userId)
  if (!students.length) redirect('/parent/schedule')
  const rememberedStudentId = (await cookies()).get(PARENT_ACTIVE_CHILD_COOKIE)?.value
  const explicitChildId = params?.childId || requestedStudentId
  if (explicitChildId && !findParentChild(students, explicitChildId)) redirect('/parent/schedule')
  const activeStudentId = resolveParentChildId(students, [params?.childId, requestedStudentId, rememberedStudentId])
  const student = students.find((s) => s.id === activeStudentId) || students[0]
  if (!groupId) redirect('/parent/schedule')

  const enrollment = await db.enrollment.findFirst({
    where: {
      studentId: { in: student.recordIds },
      deletedAt: null,
      groupId,
      status: 'ACTIVE',
      group: { intensiveMode: 'INTENSIVE', status: { not: 'ARCHIVED' }, deletedAt: null },
    },
    include: {
      group: {
        include: {
          course: { select: { id: true, name: true, subject: true, grade: true } },
          teacher: {
            select: {
              id: true, name: true, avatar: true, gender: true, tierLevel: true, bio: true,
              education: true, university: true, major: true, subjects: true, rating: true, ratingCount: true,
            },
          },
          teacherAssignments: { select: { teacherId: true, subject: true } },
        },
      },
    },
  })
  if (!enrollment) redirect('/parent/schedule')

  const [approvedAttendances, activeLessonStudents] = await Promise.all([
    db.attendance.findMany({
      where: { studentId: { in: student.recordIds }, deletedAt: null, lesson: { ...visibleClassLessonWhere, groupId, intensiveReviewStatus: 'APPROVED' } },
      select: { status: true, actualMinutes: true, lesson: { select: { actualMinutes: true } } },
    }),
    db.classLessonStudent.findMany({
      where: {
        studentId: { in: student.recordIds },
        lesson: {
          ...visibleClassLessonWhere,
          groupId,
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
          intensiveReviewStatus: { in: ['DRAFT', 'PENDING'] },
        },
      },
      select: { lesson: { select: { intensiveReviewStatus: true, attendanceSubmittedAt: true } } },
    }),
  ])
  const approvedHours = approvedAttendances.reduce(
    (sum, a) => sum + calculateIntensiveDeductHours(a.status, Number(a.actualMinutes || a.lesson?.actualMinutes || 0)),
    0,
  )
  const pendingCount = activeLessonStudents.filter((x) => x.lesson.intensiveReviewStatus === 'PENDING').length
  const bookedCount = activeLessonStudents.filter(
    (x) => x.lesson.intensiveReviewStatus === 'DRAFT' && !x.lesson.attendanceSubmittedAt,
  ).length

  const historyLessons = await db.classLesson.findMany({
    where: {
      ...visibleClassLessonWhere,
      groupId,
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      lessonStudents: { some: { studentId: { in: student.recordIds } } },
    },
    include: {
      attendances: {
        where: { studentId: { in: student.recordIds }, deletedAt: null },
        select: { status: true, actualMinutes: true, hoursDeducted: true },
      },
      classroomFeedbacks: {
        where: { status: 'PUBLISHED', deletedAt: null, studentIds: { hasSome: student.recordIds } },
        select: {
          id: true, summary: true, overallComment: true, lessonContent: true,
          knowledgePoints: true, imageUrls: true, createdAt: true, mood: true, tags: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      intensiveReviews: {
        orderBy: { revision: 'desc' },
        take: 1,
        select: { status: true, actualMinutes: true, reviewedAt: true, reviewNote: true },
      },
    },
    orderBy: [{ lessonDate: 'desc' }, { startTime: 'desc' }],
    take: 30,
  })

  const photos = historyLessons
    .flatMap((lesson) => lesson.classroomFeedbacks.flatMap((feedback) => feedback.imageUrls || []))
    .slice(0, 60)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '12px 14px 24px' }}>
      <IntensiveDetailView
        student={JSON.parse(JSON.stringify(student))}
        enrollment={JSON.parse(JSON.stringify(enrollment))}
        summary={{
          approvedHours,
          pendingCount,
          bookedCount,
          totalHours: Number(enrollment.totalHours || 0),
          usedHours: Number(enrollment.usedHours || 0),
          remainHours: Number(enrollment.remainHours || 0),
        }}
        historyLessons={JSON.parse(JSON.stringify(historyLessons))}
        photos={photos}
        showBack
      />
    </div>
  )
}
