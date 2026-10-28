import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { PARENT_ACTIVE_CHILD_COOKIE } from '@/constants/membership'
import {
  parentActiveEnrollmentWhere,
  parentActiveStudentWhere,
  parentLinkedStudentWhere,
  parentVisibleLessonWhere,
  visibleClassroomFeedbackWhere,
  visibleClassGroupWhere,
} from '@/lib/business-visibility'
import { calculateIntensiveDeductHours } from '@/lib/intensive-class'
import { localDateColumnValue, todayLocal } from '@/lib/date/local-day'
import { getParentChildren } from '@/lib/parent-children'
import { resolveParentChildId } from '@/lib/parent-child-selection'
import { IntensiveListClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentVipPage({ searchParams }: { searchParams?: Promise<{ childId?: string; studentId?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id
  const db = await getRequestPrisma()
  const children = await getParentChildren(db, userId)

  const students = await db.student.findMany({
    where: parentActiveStudentWhere(userId),
    distinct: ['id'],
    select: {
      id: true,
      identityId: true,
      name: true,
      grade: true,
      membershipLevel: true,
      enrollments: {
        where: { status: 'ACTIVE', group: { intensiveMode: 'INTENSIVE', status: { not: 'ARCHIVED' } } },
        select: {
          id: true,
          totalHours: true,
          usedHours: true,
          remainHours: true,
          group: {
            select: {
              id: true,
              name: true,
              intensiveMode: true,
              teachingType: true,
              course: { select: { name: true, subject: true } },
              teacher: {
                select: {
                  id: true, name: true, avatar: true, gender: true, tierLevel: true,
                  bio: true, education: true, university: true, major: true, subjects: true,
                  rating: true, ratingCount: true,
                },
              },
              teacherAssignments: { select: { teacherId: true, subject: true } },
            },
          },
        },
      },
    },
  })

  const linkedStudentIds = students.map((student) => student.id)
  const mergedStudents = children.map((child) => ({
    ...child,
    enrollments: students.filter((student) => child.recordIds.includes(student.id)).flatMap((student) => student.enrollments),
  }))
  const params = await searchParams
  const rememberedChildId = (await cookies()).get(PARENT_ACTIVE_CHILD_COOKIE)?.value
  const initialSelectedStudentId = resolveParentChildId(mergedStudents, [params?.childId, params?.studentId, rememberedChildId])
  const today = new Date(`${todayLocal()}T00:00:00.000Z`)
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const nextMonday = localDateColumnValue(todayKey)

  const [approvedAttendances, activeIntensiveLessonStudents, historyLessons] = linkedStudentIds.length
    ? await Promise.all([
        db.attendance.findMany({
          where: {
            studentId: { in: linkedStudentIds },
            lesson: {
              intensiveReviewStatus: 'APPROVED',
              group: { intensiveMode: 'INTENSIVE' },
            },
          },
          select: {
            studentId: true,
            status: true,
            actualMinutes: true,
            hoursDeducted: true,
            lesson: { select: { groupId: true, actualMinutes: true } },
          },
        }),
        db.classLessonStudent.findMany({
          where: {
            studentId: { in: linkedStudentIds },
            lesson: {
              status: { notIn: ['CANCELLED', 'POSTPONED'] },
              intensiveReviewStatus: { in: ['DRAFT', 'PENDING'] },
              group: { intensiveMode: 'INTENSIVE' },
            },
          },
          select: {
            studentId: true,
            lesson: {
              select: {
                groupId: true,
                intensiveReviewStatus: true,
                attendanceSubmittedAt: true,
              },
            },
          },
        }),
        (() => {
          const where: Prisma.ClassLessonWhereInput = {
            ...parentVisibleLessonWhere(userId),
            group: {
              ...visibleClassGroupWhere,
              intensiveMode: 'INTENSIVE',
              status: { not: 'ARCHIVED' },
              enrollments: { some: parentActiveEnrollmentWhere(userId) },
            },
            lessonDate: { lt: nextMonday },
            OR: [
              { attendanceSubmittedAt: { not: null } },
              { intensiveReviewStatus: { in: ['PENDING', 'APPROVED', 'REJECTED'] } },
            ],
          }
          return db.classLesson.findMany({
            where,
          include: {
            group: {
              include: {
                course: true,
                teacher: { select: { id: true, name: true } },
                teacherAssignments: { select: { teacherId: true, subject: true } },
              },
            },
            teacher: { select: { id: true, name: true } },
            lessonStudents: {
              where: { student: parentLinkedStudentWhere(userId) },
              include: { student: { select: { id: true, name: true } } },
            },
            attendances: {
              where: { student: parentLinkedStudentWhere(userId) },
              select: { id: true, studentId: true, status: true, actualMinutes: true, hoursDeducted: true },
            },
            classroomFeedbacks: {
              where: { ...visibleClassroomFeedbackWhere, studentIds: { hasSome: linkedStudentIds } },
              select: {
                id: true, teacherId: true, studentIds: true, createdAt: true, summary: true,
                overallComment: true, lessonContent: true, knowledgePoints: true, imageUrls: true, mood: true, tags: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            intensiveReviews: {
              select: { status: true, actualMinutes: true, submittedAt: true, reviewedAt: true, reviewNote: true },
              orderBy: { revision: 'desc' },
              take: 1,
            },
          },
          orderBy: [{ lessonDate: 'desc' }, { startTime: 'desc' }],
          take: 40,
          })
        })(),
      ])
    : [[], [], []]

  const summaryMap = new Map<string, { studentId: string; groupId: string; approvedHours: number; pendingCount: number; bookedCount: number }>()
  const ensureSummary = (studentId: string, groupId: string) => {
    const key = `${studentId}:${groupId}`
    const existing = summaryMap.get(key)
    if (existing) return existing
    const created = { studentId, groupId, approvedHours: 0, pendingCount: 0, bookedCount: 0 }
    summaryMap.set(key, created)
    return created
  }
  approvedAttendances.forEach((attendance) => {
    const approvedMinutes = Number(attendance.actualMinutes || attendance.lesson?.actualMinutes || 0)
    const approvedTeachingHours = calculateIntensiveDeductHours(attendance.status, approvedMinutes)
    ensureSummary(attendance.studentId, attendance.lesson!.groupId).approvedHours += approvedTeachingHours
  })
  activeIntensiveLessonStudents.forEach((item) => {
    const summary = ensureSummary(item.studentId, item.lesson.groupId)
    if (item.lesson.intensiveReviewStatus === 'PENDING') summary.pendingCount += 1
    else if (item.lesson.intensiveReviewStatus === 'DRAFT' && !item.lesson.attendanceSubmittedAt) summary.bookedCount += 1
  })

  // 按组组织历史课次与照片
  const groupLessonsMap = new Map<string, typeof historyLessons>()
  for (const lesson of historyLessons) {
    if (!groupLessonsMap.has(lesson.groupId)) groupLessonsMap.set(lesson.groupId, [])
    groupLessonsMap.get(lesson.groupId)!.push(lesson)
  }

  return (
    <IntensiveListClient
      students={JSON.parse(JSON.stringify(mergedStudents))}
      initialSelectedStudentId={initialSelectedStudentId}
      summary={[...summaryMap.values()]}
      groupLessons={Object.fromEntries([...groupLessonsMap.entries()].map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]))}
    />
  )
}
