import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalAttendance,
    present,
    leave,
    absent,
    makeup,
    completedMakeups,
    totalMakeups,
  ] = await Promise.all([
    prisma.attendance.count({ where: { lesson: { lessonDate: { gte: monthStart } } } }),
    prisma.attendance.count({ where: { status: 'PRESENT', lesson: { lessonDate: { gte: monthStart } } } }),
    prisma.attendance.count({ where: { status: 'LEAVE', lesson: { lessonDate: { gte: monthStart } } } }),
    prisma.attendance.count({ where: { status: 'ABSENT', lesson: { lessonDate: { gte: monthStart } } } }),
    prisma.attendance.count({ where: { status: 'MAKEUP', lesson: { lessonDate: { gte: monthStart } } } }),
    prisma.makeupRequest.count({ where: { status: 'COMPLETED' } }),
    prisma.makeupRequest.count(),
  ])

  return NextResponse.json({
    totalAttendance,
    presentRate: totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0,
    leaveRate: totalAttendance > 0 ? Math.round((leave / totalAttendance) * 100) : 0,
    absentRate: totalAttendance > 0 ? Math.round((absent / totalAttendance) * 100) : 0,
    makeupRate: totalAttendance > 0 ? Math.round((makeup / totalAttendance) * 100) : 0,
    makeupCompletionRate: totalMakeups > 0 ? Math.round((completedMakeups / totalMakeups) * 100) : 0,
    totalMakeups,
    completedMakeups,
  })
}
