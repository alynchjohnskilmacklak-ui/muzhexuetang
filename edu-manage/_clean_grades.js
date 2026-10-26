const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const gs = await p.classGroup.findMany({ where: { name: { contains: '冲刺班' }, deletedAt: null }, select: { id: true, courseId: true, name: true } })
  const target = gs.filter(g => /^(初二|初三)冲刺班/.test(g.name))
  for (const g of target) {
    await p.enrollment.deleteMany({ where: { groupId: g.id } })
    await p.classGroup.delete({ where: { id: g.id } })
    try { await p.course.delete({ where: { id: g.courseId } }) } catch (e) {}
  }
  console.log('cleaned', target.length)
  await p.$disconnect()
})()
