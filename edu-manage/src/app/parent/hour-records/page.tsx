import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { parentActiveEnrollmentWhere, parentLinkedStudentWhere } from '@/lib/business-visibility'
import { ParentHourRecordsClient } from './client'
import { calculateIntensiveDeductHours } from '@/lib/intensive-class'

export const dynamic = 'force-dynamic'

export default async function ParentHourRecordsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const db = await getRequestPrisma()

  const students = await db.student.findMany({
    where: parentLinkedStudentWhere(userId),
    select: {
      id: true,
      name: true,
      grade: true,
      enrollments: {
        where: parentActiveEnrollmentWhere(userId),
        include: {
          group: {
            include: {
              course: true,
              teacher: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const attendances = await db.attendance.findMany({
    where: {
      student: parentLinkedStudentWhere(userId),
      OR: [
        { hoursDeducted: { gt: 0 } },
        {
          lesson: {
            intensiveReviewStatus: 'APPROVED',
            group: { intensiveMode: 'INTENSIVE' },
          },
        },
      ],
    },
    include: {
      student: { select: { id: true, name: true } },
      lesson: {
        include: {
          teacher: { select: { id: true, name: true } },
          group: {
            include: {
              course: true,
              teacher: { select: { id: true, name: true } },
              room: true,
            },
          },
        },
      },
      schedule: {
        include: {
          course: true,
          teacher: { select: { id: true, name: true } },
          room: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const hourTransactions = await db.hourTransaction.findMany({
    where: {
      student: parentLinkedStudentWhere(userId),
    },
    include: {
      student: { select: { id: true, name: true } },
      enrollment: {
        include: {
          group: {
            include: {
              course: true,
              teacher: { select: { id: true, name: true } },
              room: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const records = [
    ...attendances.map((attendance) => ({
      ...attendance,
      isIntensiveApproved: attendance.lesson?.group?.intensiveMode === 'INTENSIVE'
        && attendance.lesson?.intensiveReviewStatus === 'APPROVED',
      approvedTeachingHours: attendance.lesson?.group?.intensiveMode === 'INTENSIVE'
        && attendance.lesson?.intensiveReviewStatus === 'APPROVED'
        ? calculateIntensiveDeductHours(
            attendance.status,
            Number(attendance.actualMinutes || attendance.lesson.actualMinutes || 0),
          )
        : 0,
    })),
    ...hourTransactions.map((transaction) => ({
      id: transaction.id,
      student: transaction.student,
      status: 'ADJUSTMENT',
      createdAt: transaction.createdAt,
      hoursDeducted: transaction.amount,
      adjustmentType: transaction.type,
      adjustmentReason: transaction.reason,
      enrollment: transaction.enrollment,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <ParentHourRecordsClient
      students={JSON.parse(JSON.stringify(students))}
      records={JSON.parse(JSON.stringify(records))}
    />
  )
}
