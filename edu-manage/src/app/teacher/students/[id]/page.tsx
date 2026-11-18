import { notFound } from 'next/navigation'
import { getRequestPrisma } from '@/lib/prisma'
import { assertTeacherOwnsStudent, requireTeacherPage, teacherLessonWhere } from '@/lib/teacher-portal'
import { calculateApprovedIntensiveHours, calculateTaughtHours } from '@/lib/student-taught-hours'
import { TeacherStudentDetailClient } from './client'

export const dynamic = 'force-dynamic'

export default async function TeacherStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacherPage()
  const { id } = await params
  const db = await getRequestPrisma()
  if (!await assertTeacherOwnsStudent(teacher.id, id, db)) notFound()
  const student = await db.student.findFirst({
    where: {
      id,
      status: { not: 'INACTIVE' },
    },
    include: {
      enrollments: {
        where: {
          status: 'ACTIVE',
          group: {
            status: { not: 'ARCHIVED' },
            course: { isActive: true },
          },
        },
        include: { group: { include: { course: true, teacherAssignments: true } } },
      },
      classLessonStudents: {
        where: { lesson: teacherLessonWhere(teacher.id) },
        select: { lesson: { select: { groupId: true } } },
      },
      examPapers: { where: { teacherId: teacher.id, status: { not: 'DELETED' } }, orderBy: { createdAt: 'desc' }, take: 20 },
      performancePosts: { where: { teacherId: teacher.id, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 20 },
      attendances: {
        where: {
          lesson: {
            group: {
              status: { not: 'ARCHIVED' },
              course: { isActive: true },
            },
            OR: [
              { teacherId: teacher.id },
              { teacherId: null, group: { teacherId: teacher.id } },
              { teacherId: null, group: { teacherAssignments: { some: { teacherId: teacher.id } } } },
            ],
          },
        },
        include: { lesson: { include: { group: { include: { course: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
    },
  })
  if (!student) notFound()

  const feedbacks = await db.classroomFeedback.findMany({
    where: {
      teacherId: teacher.id,
      studentIds: { has: student.id },
      deletedAt: null,
    },
    include: {
      classLesson: {
        select: {
          lessonDate: true,
          startTime: true,
          group: { select: { course: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })

  const visibleGroupIds = new Set(student.classLessonStudents.map((snapshot) => snapshot.lesson.groupId))
  const visibleEnrollments = student.enrollments.filter((enrollment) => visibleGroupIds.has(enrollment.groupId))

  const approvedIntensiveAttendances = await db.attendance.findMany({
    where: {
      studentId: student.id,
      lesson: {
        intensiveReviewStatus: 'APPROVED',
        group: { intensiveMode: 'INTENSIVE' },
        OR: [
          { teacherId: teacher.id },
          {
            teacherId: null,
            group: {
              OR: [
                { teacherId: teacher.id },
                { teacherAssignments: { some: { teacherId: teacher.id } } },
              ],
            },
          },
        ],
      },
    },
    select: {
      status: true,
      actualMinutes: true,
      lesson: { select: { actualMinutes: true } },
    },
  })
  const taughtHours = calculateTaughtHours(
    visibleEnrollments,
    calculateApprovedIntensiveHours(approvedIntensiveAttendances),
  )
  const courseNames = [...new Set(visibleEnrollments.map((enrollment) => enrollment.group.course.name))]

  const attendanceRate = student.attendances.length
    ? Math.round((student.attendances.filter((a) => a.status === 'PRESENT' || a.status === 'MAKEUP').length / student.attendances.length) * 100)
    : null

  const remainHours = visibleEnrollments.reduce((sum, e) => sum + (Number(e.remainHours ?? 0)), 0)

  return (
    <TeacherStudentDetailClient
      student={{
        id: student.id,
        name: student.name,
        grade: student.grade,
        gender: student.gender,
        school: student.school,
        membershipLevel: student.membershipLevel,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        phone: student.phone,
        status: student.status,
        courseNames,
        taughtHours: Number(taughtHours.toFixed(1)),
        remainHours: Number(remainHours.toFixed(1)),
        attendanceRate,
      }}
      feedbacks={feedbacks.map((f) => ({
        id: f.id,
        createdAt: f.createdAt.toISOString(),
        lessonDate: f.classLesson?.lessonDate?.toISOString() || null,
        courseName: f.classLesson?.group.course.name || null,
        knowledgePoints: f.knowledgePoints || [],
        summary: f.summary || '',
        mood: f.mood,
        imageUrls: f.imageUrls || [],
        parentReply: f.parentReply,
        parentRepliedAt: f.parentRepliedAt?.toISOString() || null,
      }))}
      performancePosts={student.performancePosts.map((p) => ({
        id: p.id,
        createdAt: p.createdAt.toISOString(),
        mood: p.mood,
        content: p.content,
      }))}
      attendances={student.attendances.filter((a) => a.lesson).map((a) => ({
        id: a.id,
        status: a.status,
        courseName: a.lesson!.group.course.name,
        lessonDate: a.lesson!.lessonDate.toISOString(),
        startTime: a.lesson!.startTime,
      }))}
    />
  )
}
