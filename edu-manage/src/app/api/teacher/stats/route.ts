import { NextResponse } from 'next/server'
import { requireCurrentTeacher, teacherLessonWhere, teacherStudentWhere } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
    const { teacher, prisma } = await requireCurrentTeacher()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalStudents, monthlyPapers, monthlyAttendance] = await Promise.all([
      prisma.student.count({ where: teacherStudentWhere(teacher.id) }),
      prisma.examPaper.count({ where: { teacherId: teacher.id, paperDate: { gte: monthStart }, status: 'PUBLISHED' } }),
      prisma.attendance.count({ where: { status: 'PRESENT', lesson: teacherLessonWhere(teacher.id), createdAt: { gte: monthStart } } }),
    ])

    return NextResponse.json({ totalStudents, monthlyPapers, monthlyAttendance })
})
