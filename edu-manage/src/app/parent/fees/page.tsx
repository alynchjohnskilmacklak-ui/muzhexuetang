import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentFeesClient } from './client'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { cookies } from 'next/headers'
import { PARENT_ACTIVE_CHILD_COOKIE } from '@/constants/membership'

export const dynamic = 'force-dynamic'

export default async function ParentFeesPage({ searchParams }: { searchParams?: Promise<{ childId?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const db = await getRequestPrisma()
  const userId = (session.user as { id: string }).id
  const params = await searchParams
  const children = await getParentChildren(db, userId)
  const remembered = (await cookies()).get(PARENT_ACTIVE_CHILD_COOKIE)?.value
  const requested = params?.childId
  const child = findParentChild(children, requested || remembered || null)
  if (requested && requested !== 'all' && !child) redirect('/parent/fees')
  const activeChild = requested === 'all' ? null : child || children[0] || null
  const studentWhere = { ...parentLinkedStudentWhere(userId), id: { in: activeChild?.recordIds || children.flatMap((item) => item.recordIds) } }
  const activeStudentIds = activeChild?.recordIds || children.flatMap((item) => item.recordIds)

  const [fees, enrollments, attendances] = await Promise.all([
    db.fee.findMany({
      where: { deletedAt: null, student: studentWhere, OR: [{ courseId: null }, { course: { isActive: true } }] },
      include: { student: true, course: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.enrollment.findMany({
      where: { studentId: { in: activeStudentIds }, deletedAt: null },
      include: { group: { include: { course: true } }, student: true },
    }),
    db.attendance.findMany({
      where: { studentId: { in: activeStudentIds }, hoursDeducted: { gt: 0 } },
      include: {
        student: { select: { name: true } },
        lesson: {
          include: {
            teacher: { select: { name: true } },
            group: { include: { course: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  const hourDeductions = attendances.map((att) => ({
    id: att.id,
    studentName: att.student?.name || '',
    date: att.lesson?.lessonDate ? att.lesson.lessonDate.toISOString().slice(0, 10) : att.createdAt.toISOString().slice(0, 10),
    time: att.lesson?.startTime && att.lesson?.endTime ? `${att.lesson.startTime}-${att.lesson.endTime}` : '',
    courseName: att.lesson?.group?.course?.name || att.lesson?.group?.name || '学科培优',
    teacherName: att.lesson?.teacher?.name || '任课老师',
    hoursDeducted: att.hoursDeducted,
    status: att.status === 'PRESENT' ? '正常出勤' : att.status === 'LEAVE' ? '请假扣减' : '出勤已核',
  }))

  const enrollmentBalances = enrollments.map((enr) => ({
    id: enr.id,
    studentName: enr.student?.name || '',
    courseName: enr.group?.course?.name || enr.group?.name || '学科培优',
    totalHours: enr.totalHours,
    usedHours: enr.usedHours,
    remainHours: enr.remainHours,
  }))

  const feeData = fees.map(f => ({
    key: f.id,
    id: f.id,
    student: f.student.name,
    course: f.course?.name || '',
    amount: f.amount,
    type: f.type,
    status: f.status,
    date: f.createdAt.toISOString().split('T')[0],
    paidAt: f.paidAt ? f.paidAt.toISOString().split('T')[0] : null,
  }))

  const totalPaid = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  const totalPending = fees.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0)

  return (
    <ParentFeesClient
      feeData={feeData}
      hourDeductions={hourDeductions}
      enrollmentBalances={enrollmentBalances}
      linkedChildren={children}
      activeChildId={activeChild?.id || 'all'}
      totalPaid={totalPaid}
      totalPending={totalPending}
    />
  )
}
