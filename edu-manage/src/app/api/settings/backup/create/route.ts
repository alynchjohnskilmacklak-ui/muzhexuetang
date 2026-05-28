import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const [students, teachers, courses, classGroups, fees, enrollments, attendances, examPapers, makeups] =
    await Promise.all([
      prisma.student.findMany(),
      prisma.teacher.findMany(),
      prisma.course.findMany(),
      prisma.classGroup.findMany(),
      prisma.fee.findMany(),
      prisma.enrollment.findMany(),
      prisma.attendance.findMany({ take: 5000 }),
      prisma.examPaper.findMany({ take: 1000 }),
      prisma.makeupRequest.findMany(),
    ])

  const backup = {
    exportedAt: new Date().toISOString(),
    exportedBy: user.name,
    summary: {
      students: students.length,
      teachers: teachers.length,
      courses: courses.length,
      classGroups: classGroups.length,
      fees: fees.length,
      enrollments: enrollments.length,
      attendances: attendances.length,
      examPapers: examPapers.length,
      makeups: makeups.length,
    },
    data: { students, teachers, courses, classGroups, fees, enrollments, attendances, examPapers, makeups },
  }

  await prisma.activityLog.create({
    data: { userId: user.id, action: '执行了数据备份', detail: `备份了 ${backup.summary.students} 名学员等数据` },
  })

  return NextResponse.json(backup)
})
