import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (!admin) throw new Error('缺少管理员账号')

  const term = await prisma.academicTerm.upsert({
    where: { id: 'test-term-2026' },
    update: { status: 'ACTIVE' },
    create: {
      id: 'test-term-2026',
      name: '2026 秋季运营批次',
      code: '2026-AUTUMN',
      division: 'JUNIOR',
      kind: 'REGULAR',
      status: 'ACTIVE',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-31'),
      createdById: admin.id,
    },
  })

  // 把其余批次降为 DRAFT（保持唯一 ACTIVE）
  await prisma.academicTerm.updateMany({
    where: { division: 'JUNIOR', status: 'ACTIVE', id: { not: term.id } },
    data: { status: 'DRAFT' },
  })

  // 班级挂到本批次
  await prisma.classGroup.update({ where: { id: 'test-group-math' }, data: { termId: term.id } })

  // 学生加入本批次
  for (const sid of ['test-student-1', 'test-student-2', 'test-student-3']) {
    await prisma.studentTermMembership.upsert({
      where: { termId_studentId: { studentId: sid, termId: term.id } },
      update: { status: 'ACTIVE' },
      create: {
        studentId: sid,
        termId: term.id,
        grade: '初一',
        status: 'ACTIVE',
        joinedAt: new Date('2026-09-01'),
      },
    })
  }

  console.log('运营批次已激活: 2026 秋季运营批次 (JUNIOR)')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
