import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { PrismaClient } from '@prisma/client'
import { sanitizeDataAdminRecord } from '../src/lib/data-admin/entities'

function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^"|"$/g, '')
  }
}

async function exportOne(prisma: PrismaClient, fileName: string, label: string) {
  const exportedAt = new Date()
  const data = {
    exportedAt: exportedAt.toISOString(),
    division: label || 'default',
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
  const filePath = path.join(exportsDir, fileName)
  await writeFile(filePath, JSON.stringify(sanitizeDataAdminRecord(data), null, 2), 'utf8')

  await prisma.activityLog.create({
    data: {
      action: 'DATA_EXPORT',
      detail: `导出核心业务数据：${filePath}`,
      metadata: { filePath, exportedAt: exportedAt.toISOString(), division: label || 'default' },
    },
  })

  console.log(`业务数据已导出：${filePath}`)
}

async function main() {
  loadDotEnv()
  const { getPrismaForDivision, isDualDbEnabled, prisma } = await import('../src/lib/prisma')

  if (isDualDbEnabled()) {
    await exportOne(getPrismaForDivision('JUNIOR'), 'junior-business-data.json', 'JUNIOR')
    await exportOne(getPrismaForDivision('SENIOR'), 'senior-business-data.json', 'SENIOR')
    await Promise.all([
      getPrismaForDivision('JUNIOR').$disconnect(),
      getPrismaForDivision('SENIOR').$disconnect(),
    ])
    return
  }

  const exportedAt = new Date()
  await exportOne(prisma, `business-data-${exportedAt.toISOString().slice(0, 10)}.json`, '')
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
