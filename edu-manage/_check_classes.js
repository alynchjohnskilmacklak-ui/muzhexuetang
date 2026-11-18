const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const groups = await p.classGroup.findMany({
    where: { deletedAt: null },
    select: {
      id: true, name: true, status: true,
      course: { select: { name: true, subject: true, grade: true } },
      enrollments: { select: { student: { select: { name: true } } } },
    },
  })
  const rows = groups.map(g => ({ name: g.name, status: g.status, subject: g.course?.subject, grade: g.course?.grade, students: g.enrollments.map(e => e.student.name).join('/') }))
  console.log(JSON.stringify(rows, null, 1))
}
main().finally(() => p.$disconnect())
