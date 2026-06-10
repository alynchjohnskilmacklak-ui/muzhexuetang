import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentArchiveClient } from './client'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function ParentArchivePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id

  // Basic ownership check: find all active students linked to this parent
  // We use the simplest possible filter to avoid Prisma "Unknown argument" issues
  const linkedStudentWhere: Prisma.StudentWhereInput = {
    OR: [{ parentId: userId }, { parentUserId: userId }],
    status: { not: 'INACTIVE' },
  }

  // Grade records for the parent's students
  const gradeRecords = await prisma.gradeRecord.findMany({
    where: {
      student: linkedStudentWhere,
    },
    include: {
      student: { select: { id: true, name: true } },
      assessment: { select: { id: true, name: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Exam papers for the parent's students
  const examPapers = await prisma.examPaper.findMany({
    where: {
      status: 'PUBLISHED',
      student: linkedStudentWhere,
    },
    include: {
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
    },
    orderBy: { paperDate: 'desc' },
    take: 50,
  })

  // This month attendance summary
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const monthAttendances = await prisma.attendance.findMany({
    where: {
      student: linkedStudentWhere,
      createdAt: { gte: monthStart, lt: monthEnd },
    },
    select: { studentId: true, status: true },
  })

  const studentIds = [...new Set(monthAttendances.map(a => a.studentId))]
  const attendanceSummary = studentIds.map(sid => {
    const records = monthAttendances.filter(a => a.studentId === sid)
    return {
      studentId: sid,
      total: records.length,
      present: records.filter(r => r.status === 'PRESENT').length,
      rate: records.length > 0 ? Math.round((records.filter(r => r.status === 'PRESENT').length / records.length) * 100) : 0,
    }
  })

  return (
    <ParentArchiveClient
      gradeRecords={JSON.parse(JSON.stringify(gradeRecords))}
      examPapers={JSON.parse(JSON.stringify(examPapers))}
      attendanceSummary={JSON.parse(JSON.stringify(attendanceSummary))}
    />
  )
}
