const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const fs = await p.feedback.findMany({
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: { _count: { select: { records: true } }, records: { take: 5, select: { student: { select: { name: true } }, status: true, createdAt: true } } },
  })
  console.log(fs.map(f => JSON.stringify({ id: f.id, status: f.status, subject: f.subject, created: f.createdAt.toISOString().slice(0, 19), records: f._count.records, students: f.records.map(r => r.student?.name) })))
  await p.$disconnect()
})()
