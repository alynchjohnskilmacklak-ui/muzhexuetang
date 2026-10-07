import { NextResponse } from 'next/server'
import { requireCurrentTeacher, teacherLessonScopeWhere, teacherStudentWhere } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import { getActiveAcademicTerm } from '@/lib/academic-term'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
    const { teacher, prisma } = await requireCurrentTeacher()
    const activeTerm = await getActiveAcademicTerm(prisma, teacher.division)
    const termId = activeTerm?.id || '__NO_ACTIVE_TERM__'
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lessonScope = await teacherLessonScopeWhere(prisma, teacher.id, termId)

    const [totalStudents, monthlyPapers, monthlyAttendance] = await Promise.all([
      prisma.student.count({ where: teacherStudentWhere(teacher.id, termId) }),
      prisma.examPaper.count({ where: { teacherId: teacher.id, termId, paperDate: { gte: monthStart }, status: 'PUBLISHED' } }),
      prisma.attendance.count({ where: { status: 'PRESENT', lesson: lessonScope, createdAt: { gte: monthStart } } }),
    ])

    return NextResponse.json({ totalStudents, monthlyPapers, monthlyAttendance })
})
