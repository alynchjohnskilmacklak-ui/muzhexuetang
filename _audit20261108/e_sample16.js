const path = require('path')
const repoRoot = 'D:\\01muzhexuetang\\muzhexuetang\\coding\\edu-manage'
process.chdir(repoRoot)
require(path.join(repoRoot, 'node_modules', 'dotenv')).config({ path: path.join(repoRoot, '.env') })
const { PrismaClient } = require(path.join(repoRoot, 'node_modules', '@prisma/client'))
const prisma = new PrismaClient()
const mask = (n) => { if (n == null) return null; const s = String(n).trim(); return s ? s[0] + '**' : null }
async function main() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT s.name, cl."lessonDate"::text AS lesson_date, e.status::text AS enr_status,
            e."deletedAt"::text AS enr_deletedAt, a."hoursDeducted", a.status::text AS att_status
     FROM "Attendance" a
     JOIN "Enrollment" e ON e.id=a."enrollmentId"
     LEFT JOIN "ClassLesson" cl ON cl.id=a."lessonId"
     JOIN "Student" s ON s.id=a."studentId"
     WHERE a."deletedAt" IS NULL AND a."hoursDeducted" > 0
       AND e.status::text='WITHDRAWN' AND cl."deletedAt" IS NULL
     ORDER BY cl."lessonDate" DESC LIMIT 5`)
  console.log(JSON.stringify(rows.map(r => ({ ...r, name: mask(r.name) })), null, 2))
}
main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
