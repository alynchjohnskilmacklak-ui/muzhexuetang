import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { getRequestDivision } from '@/lib/division'
import { getDataAdminDivisionScope } from '@/lib/data-admin/division-scope'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    const prisma = await getRequestPrisma()
    const division = getRequestDivision(session.user as Record<string, unknown> | undefined, req.nextUrl.searchParams.get('division'))

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const [
      studentCount,
      teacherCount,
      classGroupCount,
      monthLessonCount,
      activeEnrollmentCount,
      todayAttendanceCount,
      todayFeedbackCount,
    ] = await Promise.all([
      prisma.student.count({ where: { ...getDataAdminDivisionScope('students', division), status: { not: 'INACTIVE' }, deletedAt: null } }),
      prisma.teacher.count({ where: { ...getDataAdminDivisionScope('teachers', division), status: 'ACTIVE' } }),
      prisma.classGroup.count({ where: { ...getDataAdminDivisionScope('class-groups', division), status: { not: 'ARCHIVED' }, deletedAt: null } }),
      prisma.classLesson.count({ where: { ...getDataAdminDivisionScope('class-lessons', division), lessonDate: { gte: monthStart, lt: monthEnd }, status: { not: 'CANCELLED' }, deletedAt: null } }),
      prisma.enrollment.count({ where: { ...getDataAdminDivisionScope('enrollments', division), status: 'ACTIVE', deletedAt: null } }),
      prisma.attendance.count({ where: { ...getDataAdminDivisionScope('attendances', division), createdAt: { gte: todayStart, lt: todayEnd }, deletedAt: null } }),
      prisma.classroomFeedback.count({ where: { ...getDataAdminDivisionScope('classroom-feedbacks', division), status: 'PUBLISHED', createdAt: { gte: todayStart, lt: todayEnd }, deletedAt: null } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        students: studentCount,
        teachers: teacherCount,
        classGroups: classGroupCount,
        monthLessons: monthLessonCount,
        activeEnrollments: activeEnrollmentCount,
        todayAttendances: todayAttendanceCount,
        todayFeedbacks: todayFeedbackCount,
      },
    })
  } catch (error) {
    console.error('data-admin overview error:', error)
    return NextResponse.json({ error: '概览统计失败' }, { status: 500 })
  }
}
