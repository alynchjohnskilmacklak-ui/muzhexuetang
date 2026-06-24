import { NextResponse } from 'next/server'
import { differenceInDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const { teacher } = await requireCurrentTeacher()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const students = await prisma.student.findMany({
    where: {
      status: { not: 'INACTIVE' },
      enrollments: {
        some: {
          status: 'ACTIVE',
          group: {
            status: { not: 'ARCHIVED' },
            course: { isActive: true },
            OR: [
              { teacherId: teacher.id },
              { teacherAssignments: { some: { teacherId: teacher.id } } },
            ],
          },
        },
      },
    },
    include: {
      enrollments: {
        where: {
          status: 'ACTIVE',
          group: {
            status: { not: 'ARCHIVED' },
            course: { isActive: true },
            OR: [
              { teacherId: teacher.id },
              { teacherAssignments: { some: { teacherId: teacher.id } } },
            ],
          },
        },
        include: {
          group: {
            include: {
              course: true,
              teacherAssignments: {
                where: { teacherId: teacher.id },
                include: { teacher: { select: { id: true, name: true, subjects: true } } },
              },
            },
          },
        },
      },
      attendances: {
        where: { createdAt: { gte: monthStart }, lesson: { OR: [{ teacherId: teacher.id }, { group: { teacherId: teacher.id } }, { group: { teacherAssignments: { some: { teacherId: teacher.id } } } }] } },
        select: { id: true, status: true, createdAt: true, lesson: { select: { id: true, lessonDate: true, startTime: true, endTime: true, group: { select: { name: true, course: { select: { name: true, subject: true } } } } } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const lastPosts = await prisma.performancePost.findMany({
    where: { teacherId: teacher.id, studentId: { in: students.map((student) => student.id) }, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { studentId: true, createdAt: true },
  })
  const lastFeedbackMap = new Map<string, Date>()
  for (const post of lastPosts) {
    if (!lastFeedbackMap.has(post.studentId)) lastFeedbackMap.set(post.studentId, post.createdAt)
  }

  return NextResponse.json(students.map((student) => {
    const activeEnrollments = student.enrollments.filter((enrollment) => (
      enrollment.status === 'ACTIVE'
      && enrollment.group?.status !== 'ARCHIVED'
      && enrollment.group?.course?.isActive !== false
    ))
    const remainHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0)
    const totalHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalHours || 0), 0)
    const attendanceTotal = student.attendances.length
    const present = student.attendances.filter((attendance) => attendance.status === 'PRESENT').length
    const lastFeedback = lastFeedbackMap.get(student.id) || null
    return {
      ...student,
      enrollments: activeEnrollments,
      remainHours,
      totalHours,
      attendanceRate: attendanceTotal ? Math.round((present / attendanceTotal) * 100) : 100,
      lastFeedback,
      daysSinceLastFeedback: lastFeedback ? differenceInDays(now, lastFeedback) : 999,
    }
  }))
})
