const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const fs = await p.classroomFeedback.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, knowledgeCard: true, knowledgePoints: true, status: true, studentIds: true },
  })
  for (const f of fs) {
    console.log('ID:', f.id, '| status:', f.status, '| students:', (f.studentIds||[]).length)
    console.log('  kp:', JSON.stringify(f.knowledgePoints))
    console.log('  card:', JSON.stringify(f.knowledgeCard).slice(0, 400))
  }
  await p.$disconnect()
})()
