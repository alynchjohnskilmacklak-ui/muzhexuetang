import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../src/lib/prisma'
import { sanitizeDataAdminRecord } from '../src/lib/data-admin/entities'

async function main() {
  const exportedAt = new Date()
  const data = {
    exportedAt: exportedAt.toISOString(),
    students: await prisma.student.findMany({ orderBy: { createdAt: 'desc' } }),
    teachers: await prisma.teacher.findMany({ orderBy: { createdAt: 'desc' } }),
    classGroups: await prisma.classGroup.findMany({ orderBy: { createdAt: 'desc' } }),
    classLessons: await prisma.classLesson.findMany({ orderBy: { lessonDate: 'desc' } }),
    enrollments: await prisma.enrollment.findMany({ orderBy: { enrolledAt: 'desc' } }),
    attendances: await prisma.attendance.findMany({ orderBy: { createdAt: 'desc' } }),
    examPapers: await prisma.examPaper.findMany({ orderBy: { createdAt: 'desc' } }),
    classroomFeedbacks: await prisma.classroomFeedback.findMany({ orderBy: { createdAt: 'desc' } }),
    notifications: await prisma.notification.findMany({ orderBy: { createdAt: 'desc' } }),
    studyMaterials: await prisma.studyMaterial.findMany({ orderBy: { createdAt: 'desc' } }),
    mealMenus: await prisma.mealMenu.findMany({ orderBy: { weekStart: 'desc' } }),
    performancePosts: await prisma.performancePost.findMany({ orderBy: { createdAt: 'desc' } }),
  }

  const exportsDir = path.join(process.cwd(), 'exports')
  await mkdir(exportsDir, { recursive: true })
  const filePath = path.join(exportsDir, `business-data-${exportedAt.toISOString().slice(0, 10)}.json`)
  await writeFile(filePath, JSON.stringify(sanitizeDataAdminRecord(data), null, 2), 'utf8')

  await prisma.activityLog.create({
    data: {
      action: 'DATA_EXPORT',
      detail: `导出核心业务数据：${filePath}`,
      metadata: { filePath, exportedAt: exportedAt.toISOString() },
    },
  })

  console.log(`业务数据已导出：${filePath}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
