import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

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
    format: 'edu-business-export-v1',
    restorable: false,
    limitations: ['此文件仅用于核对业务数据，不是数据库恢复备份', '最多导出5000条考勤和1000份试卷', '不包含账号、完整课堂反馈、上传照片文件和全部关联表'],
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
    data: { userId: user.id, action: '导出了业务数据', detail: `导出了 ${backup.summary.students} 名学员等数据（非恢复备份）` },
  })

  return NextResponse.json(backup)
})
