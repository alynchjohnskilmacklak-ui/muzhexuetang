import type { PrismaClient } from '@prisma/client'
import {
  getFeedbackArchive,
  type FeedbackArchiveActor,
  type FeedbackArchiveItem,
} from '@/lib/classroom-feedback/archive'
import { getParentFeedbackStudentIds } from '@/lib/classroom-feedback/access'
import { calculateIntensiveDeductHours } from '@/lib/intensive-class'

export interface StudentGrowthArchiveOptions {
  startDate?: Date
  endDate?: Date
}

export type StudentGrowthArchive = {
  student: {
    id: string
    name: string
    grade: string | null
    className: string | null
  }
  overview: {
    feedbackCount: number
    attendanceRate: number | null
    remainingHours: number
    usedHours: number
    latestFeedbackDate: string | null
    approvedIntensiveHours?: number
  }
  feedback: {
    summary: {
      totalCount: number
      subjectCount: number
      teacherCount: number
      firstFeedbackDate: string | null
      latestFeedbackDate: string | null
    }
    items: Array<Omit<FeedbackArchiveItem, 'images'> & { images?: never }>
  }
  attendance: {
    summary: {
      total: number
      present: number
      leave: number
      absent: number
      makeup: number
      rate: number | null
    }
    recentRecords: Array<{
      id: string
      date: string
      status: string
      actualMinutes: number | null
      hoursDeducted: number
      className: string | null
      subject: string | null
    }>
  }
  hours: {
    totalHours: number
    usedHours: number
    remainingHours: number
    approvedIntensiveHours?: number
    transactions: Array<{
      id: string
      amount: number
      beforeHours: number | null
      afterHours: number | null
      type: string
      reason: string | null
      lessonId: string | null
      createdAt: string
    }>
  }
  grades: {
    latest: {
      id: string
      assessmentName: string
      subject: string
      score: number
      fullScore: number
      percentage: number
      date: string
      comment: string | null
    } | null
    trend: Array<{
      id: string
      assessmentName: string
      subject: string
      score: number
      fullScore: number
      percentage: number
      date: string
    }>
  }
}

export class StudentGrowthAccessError extends Error {
  status: number

  constructor(message: string, status = 403) {
    super(message)
    this.status = status
  }
}

function rangeWhere(options: StudentGrowthArchiveOptions) {
  if (!options.startDate && !options.endDate) return undefined
  return {
    ...(options.startDate ? { gte: options.startDate } : {}),
    ...(options.endDate ? { lte: options.endDate } : {}),
  }
}

function roundHours(value: number) {
  return Math.round(value * 100) / 100
}

export async function getStudentGrowthArchive(
  prisma: PrismaClient,
  actor: FeedbackArchiveActor,
  studentId: string,
  options: StudentGrowthArchiveOptions = {},
): Promise<StudentGrowthArchive> {
  if (actor.role !== 'admin' && actor.role !== 'parent') {
    throw new StudentGrowthAccessError('无权查看学生成长档案')
  }

  if (actor.role === 'parent') {
    const linkedStudentIds = await getParentFeedbackStudentIds(prisma, actor.id)
    if (!linkedStudentIds.includes(studentId)) {
      throw new StudentGrowthAccessError('无权查看该学生成长档案')
    }
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      grade: true,
      division: true,
      enrollments: {
        select: {
          totalHours: true,
          usedHours: true,
          remainHours: true,
          status: true,
          enrolledAt: true,
          group: { select: { name: true, status: true, intensiveMode: true } },
        },
        orderBy: { enrolledAt: 'desc' },
      },
    },
  })
  if (!student) throw new StudentGrowthAccessError('学生不存在', 404)
  if (actor.division && student.division !== actor.division) {
    throw new StudentGrowthAccessError('无权查看其他学部学生')
  }

  const createdAt = rangeWhere(options)
  const assessmentDate = rangeWhere(options)
  const [feedbackArchive, attendanceGroups, recentAttendance, hourTransactions, gradeRecords, approvedIntensiveAttendances] = await Promise.all([
    getFeedbackArchive(prisma, actor, {
      studentId,
      startDate: options.startDate,
      endDate: options.endDate,
      page: 1,
      pageSize: 10,
      includeImages: false,
    }),
    prisma.attendance.groupBy({
      by: ['status'],
      where: { studentId, ...(createdAt ? { createdAt } : {}) },
      _count: { _all: true },
    }),
    prisma.attendance.findMany({
      where: { studentId, ...(createdAt ? { createdAt } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        actualMinutes: true,
        hoursDeducted: true,
        createdAt: true,
        lesson: {
          select: {
            lessonDate: true,
            group: { select: { name: true, course: { select: { subject: true } } } },
          },
        },
      },
    }),
    prisma.hourTransaction.findMany({
      where: { studentId, ...(createdAt ? { createdAt } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        amount: true,
        beforeHours: true,
        afterHours: true,
        type: true,
        reason: true,
        lessonId: true,
        createdAt: true,
      },
    }),
    prisma.gradeRecord.findMany({
      where: {
        studentId,
        ...(assessmentDate ? { assessment: { assessDate: assessmentDate } } : {}),
      },
      orderBy: { assessment: { assessDate: 'desc' } },
      take: 50,
      select: {
        id: true,
        score: true,
        comment: true,
        assessment: {
          select: {
            name: true,
            assessDate: true,
            fullScore: true,
            group: { select: { course: { select: { subject: true } } } },
          },
        },
      },
    }),
    prisma.attendance.findMany({
      where: {
        studentId,
        ...(createdAt ? { createdAt } : {}),
        lesson: {
          intensiveReviewStatus: 'APPROVED',
          group: { intensiveMode: 'INTENSIVE' },
        },
      },
      select: {
        status: true,
        actualMinutes: true,
        lesson: { select: { actualMinutes: true } },
      },
    }),
  ])

  const attendanceCounts = new Map(attendanceGroups.map((group) => [group.status, group._count._all]))
  const present = attendanceCounts.get('PRESENT') || 0
  const makeup = attendanceCounts.get('MAKEUP') || 0
  const leave = attendanceCounts.get('LEAVE') || 0
  const absent = attendanceCounts.get('ABSENT') || 0
  const attendanceTotal = present + makeup + leave + absent
  const attendanceRate = attendanceTotal ? Math.round(((present + makeup) / attendanceTotal) * 100) : null

  const prepaidEnrollments = student.enrollments.filter((enrollment) => enrollment.group.intensiveMode !== 'INTENSIVE')
  const totalHours = roundHours(prepaidEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalHours || 0), 0))
  const usedHours = roundHours(prepaidEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.usedHours || 0), 0))
  const remainingHours = roundHours(prepaidEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0))
  const approvedIntensiveHours = roundHours(approvedIntensiveAttendances.reduce((sum, attendance) => (
    sum + calculateIntensiveDeductHours(
      attendance.status,
      Number(attendance.actualMinutes || attendance.lesson?.actualMinutes || 0),
    )
  ), 0))
  const classNames = [...new Set(student.enrollments
    .filter((enrollment) => enrollment.status === 'ACTIVE' && enrollment.group.status !== 'ARCHIVED')
    .map((enrollment) => enrollment.group.name)
    .filter(Boolean))]

  const gradeTrend = gradeRecords.map((record) => {
    const fullScore = Number(record.assessment.fullScore || 0)
    const score = Number(record.score || 0)
    return {
      id: record.id,
      assessmentName: record.assessment.name,
      subject: record.assessment.group?.course?.subject || '综合',
      score,
      fullScore,
      percentage: fullScore > 0 ? Math.round((score / fullScore) * 100) : score,
      date: record.assessment.assessDate.toISOString(),
      comment: record.comment,
    }
  })

  return {
    student: {
      id: student.id,
      name: student.name,
      grade: student.grade,
      className: classNames.length ? classNames.join('、') : null,
    },
    overview: {
      feedbackCount: feedbackArchive.summary.totalCount,
      attendanceRate,
      remainingHours,
      usedHours,
      latestFeedbackDate: feedbackArchive.summary.latestFeedbackDate,
      approvedIntensiveHours,
    },
    feedback: {
      summary: feedbackArchive.summary,
      items: feedbackArchive.items.map(({ images: _images, ...item }) => item),
    },
    attendance: {
      summary: { total: attendanceTotal, present, leave, absent, makeup, rate: attendanceRate },
      recentRecords: recentAttendance.map((record) => ({
        id: record.id,
        date: (record.lesson?.lessonDate || record.createdAt).toISOString(),
        status: record.status,
        actualMinutes: record.actualMinutes,
        hoursDeducted: Number(record.hoursDeducted || 0),
        className: record.lesson?.group?.name || null,
        subject: record.lesson?.group?.course?.subject || null,
      })),
    },
    hours: {
      totalHours,
      usedHours,
      remainingHours,
      approvedIntensiveHours,
      transactions: hourTransactions.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
        beforeHours: transaction.beforeHours === null ? null : Number(transaction.beforeHours),
        afterHours: transaction.afterHours === null ? null : Number(transaction.afterHours),
        createdAt: transaction.createdAt.toISOString(),
      })),
    },
    grades: {
      latest: gradeTrend[0] || null,
      trend: gradeTrend.map(({ comment: _comment, ...grade }) => grade),
    },
  }
}
