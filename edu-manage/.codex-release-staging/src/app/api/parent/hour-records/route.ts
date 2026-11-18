import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { parentActiveEnrollmentWhere, parentLinkedStudentWhere } from '@/lib/business-visibility'
import { calculateIntensiveDeductHours } from '@/lib/intensive-class'

export const dynamic = 'force-dynamic'

/** 家长端「出勤课时」数据：考勤流水 + 课时调整 + 当前课时余额（与归档页 Tab 共用） */
export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined
  if (!user?.id || session?.user?.role !== 'parent') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId') || ''

  const students = await prisma.student.findMany({
    where: parentLinkedStudentWhere(user.id),
    select: {
      id: true,
      name: true,
      grade: true,
      enrollments: {
        where: parentActiveEnrollmentWhere(user.id),
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
  const scopedStudents = studentId ? students.filter((student) => student.id === studentId) : students
  const scopedIds = scopedStudents.map((student) => student.id)

  const attendances = await prisma.attendance.findMany({
    where: {
      student: parentLinkedStudentWhere(user.id),
      studentId: scopedIds.length ? { in: scopedIds } : undefined,
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
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const hourTransactions = await prisma.hourTransaction.findMany({
    where: {
      student: parentLinkedStudentWhere(user.id),
      studentId: scopedIds.length ? { in: scopedIds } : undefined,
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

  return NextResponse.json({ students: scopedStudents, records })
})
