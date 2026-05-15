import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: { email: 'admin@test.com', password: '123456', name: '管理员', role: 'admin' },
  })

  // Create teacher user + teacher record
  const teacherUser1 = await prisma.user.upsert({
    where: { email: 'wang@test.com' },
    update: {},
    create: { email: 'wang@test.com', password: '123456', name: '王老师', role: 'teacher' },
  })
  const teacherUser2 = await prisma.user.upsert({
    where: { email: 'li@test.com' },
    update: {},
    create: { email: 'li@test.com', password: '123456', name: '李老师', role: 'teacher' },
  })

  const t1 = await prisma.teacher.upsert({ where: { id: 't1' }, update: {}, create: { id: 't1', name: '王老师', phone: '13800001001', email: 'wang@test.com', subjects: '音乐', bio: '10年钢琴教学经验' } })
  const t2 = await prisma.teacher.upsert({ where: { id: 't2' }, update: {}, create: { id: 't2', name: '李老师', phone: '13800001002', email: 'li@test.com', subjects: '数学', bio: '15年数学教学经验' } })
  const t3 = await prisma.teacher.upsert({ where: { id: 't3' }, update: {}, create: { id: 't3', name: '张老师', phone: '13800001003', email: 'zhang@test.com', subjects: '英语', bio: '8年英语教学经验' } })
  const t4 = await prisma.teacher.upsert({ where: { id: 't4' }, update: {}, create: { id: 't4', name: '赵老师', phone: '13800001004', email: 'zhao@test.com', subjects: '编程', bio: '5年少儿编程教学经验' } })
  const t5 = await prisma.teacher.upsert({ where: { id: 't5' }, update: {}, create: { id: 't5', name: '陈老师', phone: '13800001005', email: 'chen@test.com', subjects: '美术', bio: '12年美术教学经验' } })

  const c1 = await prisma.course.upsert({ where: { id: 'c1' }, update: {}, create: { id: 'c1', name: '钢琴基础班', subject: '音乐', price: 3800, duration: 90, teacherId: t1.id } })
  const c2 = await prisma.course.upsert({ where: { id: 'c2' }, update: {}, create: { id: 'c2', name: '数学提高班', subject: '数学', price: 2800, duration: 90, teacherId: t2.id } })
  const c3 = await prisma.course.upsert({ where: { id: 'c3' }, update: {}, create: { id: 'c3', name: '英语口语班', subject: '英语', price: 3200, duration: 90, teacherId: t3.id } })
  const c4 = await prisma.course.upsert({ where: { id: 'c4' }, update: {}, create: { id: 'c4', name: '编程Scratch', subject: '编程', price: 4200, duration: 60, teacherId: t4.id } })
  const c5 = await prisma.course.upsert({ where: { id: 'c5' }, update: {}, create: { id: 'c5', name: '美术素描', subject: '美术', price: 2800, duration: 120, teacherId: t5.id } })

  // Create parent users
  const parent1 = await prisma.user.upsert({
    where: { email: 'parent1@test.com' },
    update: {},
    create: { email: 'parent1@test.com', password: '123456', name: '张爸爸', role: 'parent' },
  })
  const parent2 = await prisma.user.upsert({
    where: { email: 'parent2@test.com' },
    update: {},
    create: { email: 'parent2@test.com', password: '123456', name: '李妈妈', role: 'parent' },
  })

  // Create students linked to parents
  const s1 = await prisma.student.upsert({ where: { id: 's1' }, update: {}, create: { id: 's1', name: '张三', phone: '13900001001', status: 'active', source: '试听', parentId: parent1.id } })
  const s2 = await prisma.student.upsert({ where: { id: 's2' }, update: {}, create: { id: 's2', name: '李四', phone: '13900001002', status: 'active', source: '转介绍', parentId: parent2.id } })
  const s3 = await prisma.student.upsert({ where: { id: 's3' }, update: {}, create: { id: 's3', name: '王五', phone: '13900001003', status: 'active', source: '线上', parentId: parent1.id } })
  const s4 = await prisma.student.upsert({ where: { id: 's4' }, update: {}, create: { id: 's4', name: '赵六', phone: '13900001004', status: 'active', source: '线下', parentId: parent2.id } })
  const s5 = await prisma.student.upsert({ where: { id: 's5' }, update: {}, create: { id: 's5', name: '孙七', phone: '13900001005', status: 'active', source: '试听', parentId: parent1.id } })

  // Create grades for students
  await prisma.grade.createMany({ data: [
    { studentId: s1.id, courseId: c1.id, score: 92, type: '期中' },
    { studentId: s1.id, courseId: c1.id, score: 95, type: '期末' },
    { studentId: s2.id, courseId: c2.id, score: 88, type: '期中' },
    { studentId: s2.id, courseId: c2.id, score: 91, type: '期末' },
    { studentId: s3.id, courseId: c3.id, score: 85, type: '期中' },
    { studentId: s3.id, courseId: c3.id, score: 89, type: '期末' },
    { studentId: s4.id, courseId: c4.id, score: 94, type: '期中' },
    { studentId: s5.id, courseId: c5.id, score: 90, type: '期末' },
  ]})

  // Create fees for students
  await prisma.fee.createMany({ data: [
    { studentId: s1.id, courseId: c1.id, amount: 3800, type: '课时费', status: 'paid', paidAt: new Date('2026-05-10') },
    { studentId: s1.id, courseId: c1.id, amount: 3800, type: '课时费', status: 'pending', dueDate: new Date('2026-06-10') },
    { studentId: s2.id, courseId: c2.id, amount: 2800, type: '课时费', status: 'paid', paidAt: new Date('2026-05-08') },
    { studentId: s3.id, courseId: c3.id, amount: 3200, type: '课时费', status: 'paid', paidAt: new Date('2026-05-12') },
    { studentId: s3.id, courseId: c3.id, amount: 4800, type: '教材费', status: 'paid', paidAt: new Date('2026-05-12') },
    { studentId: s4.id, courseId: c4.id, amount: 4200, type: '课时费', status: 'paid', paidAt: new Date('2026-05-09') },
    { studentId: s5.id, courseId: c5.id, amount: 2800, type: '课时费', status: 'pending', dueDate: new Date('2026-06-15') },
  ]})

  console.log('Seed complete')
  console.log('  Admin: admin@test.com / 123456')
  console.log('  Teacher: wang@test.com / 123456')
  console.log('  Parent: parent1@test.com / 123456 (张三, 王五, 孙七)')
  console.log('  Parent: parent2@test.com / 123456 (李四, 赵六)')
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
