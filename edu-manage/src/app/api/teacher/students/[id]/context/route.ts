import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { requireCurrentTeacher, assertTeacherOwnsStudent } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id: studentId } = await params
  const { teacher, prisma } = await requireCurrentTeacher()

  const student = await assertTeacherOwnsStudent(teacher.id, studentId, prisma)
  if (!student) return NextResponse.json({ error: '无权访问该学生' }, { status: 403 })

  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

  const [
    basic, recentFeedbacks, masteryRecords,
    goals, weaknesses, stageSummary,
    attendanceRecords, recentLessons,
  ] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, grade: true, school: true, remainHours: true, totalHours: true, status: true },
    }),
    prisma.classroomFeedback.findMany({
      where: { studentIds: { has: studentId }, teacherId: teacher.id, createdAt: { gte: threeMonthsAgo } },
      select: { id: true, mood: true, summary: true, overallComment: true, imageUrls: true, parentReply: true, createdAt: true },
      orderBy: { createdAt: 'desc' }, take: 3,
    }),
    prisma.masteryRecord.findMany({
      where: { studentId, createdAt: { gte: threeMonthsAgo } },
      select: { id: true, knowledgePoint: true, level: true, note: true, createdAt: true },
      orderBy: { createdAt: 'desc' }, take: 5,
    }).catch(() => []),
    prisma.learningGoal.findMany({
      where: { studentId, isAchieved: false },
      select: { id: true, subject: true, goalDesc: true, deadline: true },
      orderBy: { createdAt: 'desc' }, take: 5,
    }),
    prisma.weaknessRecord.findMany({
      where: { studentId },
      select: { id: true, topic: true, mistakeCount: true, suggestion: true },
      orderBy: [{ mistakeCount: 'desc' }, { createdAt: 'desc' }], take: 10,
    }),
    prisma.stageSummary.findFirst({
      where: { studentId, teacherId: teacher.id, status: 'PUBLISHED' },
      select: { id: true, summary: true, periodStart: true, periodEnd: true, publishedAt: true },
      orderBy: { periodEnd: 'desc' },
    }),
    prisma.attendance.findMany({
      where: { studentId, createdAt: { gte: threeMonthsAgo } },
      select: { status: true },
    }),
    prisma.classLesson.findMany({
      where: {
        status: { not: 'CANCELLED' },
        group: { enrollments: { some: { studentId, status: 'ACTIVE' } } },
        lessonDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
      select: { id: true, lessonDate: true, startTime: true, endTime: true, group: { select: { course: { select: { name: true } } } } },
      orderBy: { lessonDate: 'asc' }, take: 5,
    }),
  ])

  if (!basic) return NextResponse.json({ error: '学生不存在' }, { status: 404 })

  const attTotal = attendanceRecords.length
  const attPresent = attendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'MAKEUP').length

  return NextResponse.json({
    basic: { ...basic },
    recentFeedbacks: recentFeedbacks.map(f => ({
      id: f.id, mood: f.mood, summary: f.summary, overallComment: f.overallComment,
      imageCount: f.imageUrls.length, parentReplied: !!f.parentReply, createdAt: f.createdAt,
    })),
    masteryRecords: masteryRecords as any[],
    goals,
    weaknesses,
    stageSummary: stageSummary ? { id: stageSummary.id, summary: stageSummary.summary, periodStart: stageSummary.periodStart, periodEnd: stageSummary.periodEnd, publishedAt: stageSummary.publishedAt } : null,
    attendance: { total: attTotal, present: attPresent, rate: attTotal ? Math.round((attPresent / attTotal) * 100) : null },
    todayLessons: recentLessons.map(l => ({ id: l.id, date: l.lessonDate, time: `${l.startTime}-${l.endTime}`, course: l.group?.course?.name || '-' })),
  })
})
