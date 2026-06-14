import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin
  const adminHash = await bcrypt.hash('123456', 10)
  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { password: adminHash },
    create: { email: 'admin@test.com', password: adminHash, name: '管理员', role: 'admin', status: 'active', division: 'ALL' },
  })

  // Super admin — can access all divisions
  const renHash = await bcrypt.hash('ren031213', 10)
  await prisma.user.upsert({
    where: { email: 'renwentao@nuc.com' },
    update: { password: renHash, division: 'ALL' },
    create: { email: 'renwentao@nuc.com', password: renHash, name: '任文涛', role: 'admin', status: 'active', division: 'ALL' },
  })
  const maHash = await bcrypt.hash('mashaokun', 10)
  await prisma.user.upsert({
    where: { email: 'mashaokun@nuc.com' },
    update: { password: maHash },
    create: { email: 'mashaokun@nuc.com', password: maHash, name: '马少坤', role: 'admin', status: 'active', division: 'JUNIOR' },
  })

  // Create teacher user + teacher record
  const teacherHash = await bcrypt.hash('123456', 10)
  await prisma.user.upsert({
    where: { email: 'wang@test.com' },
    update: { password: teacherHash },
    create: { email: 'wang@test.com', password: teacherHash, name: '王老师', role: 'teacher', status: 'active', division: 'JUNIOR' },
  })
  await prisma.user.upsert({
    where: { email: 'li@test.com' },
    update: { password: teacherHash },
    create: { email: 'li@test.com', password: teacherHash, name: '李老师', role: 'teacher', status: 'active', division: 'JUNIOR' },
  })
  // Teacher with pinyin login pattern
  const huHash = await bcrypt.hash('husitong', 10)
  await prisma.user.upsert({
    where: { email: 'husitong@tea.com' },
    update: { password: huHash },
    create: { email: 'husitong@tea.com', password: huHash, name: '胡思同', role: 'teacher', status: 'active', division: 'JUNIOR' },
  })
  const zhangHash = await bcrypt.hash('zhanglaoshi', 10)
  await prisma.user.upsert({
    where: { email: 'zhanglaoshi@tea.com' },
    update: { password: zhangHash },
    create: { email: 'zhanglaoshi@tea.com', password: zhangHash, name: '张老师', role: 'teacher', status: 'active', division: 'JUNIOR' },
  })
  const liHash = await bcrypt.hash('lilaoshi', 10)
  await prisma.user.upsert({
    where: { email: 'lilaoshi@tea.com' },
    update: { password: liHash },
    create: { email: 'lilaoshi@tea.com', password: liHash, name: '李老师', role: 'teacher', status: 'active', division: 'JUNIOR' },
  })

  const t1 = await prisma.teacher.upsert({ where: { id: 't1' }, update: {}, create: { id: 't1', name: '王老师', gender: '女', phone: '13800001001', email: 'wang@test.com', subjects: '音乐', bio: '10年钢琴教学经验', employmentType: 'FULL_TIME', education: '硕士', university: '中央音乐学院', major: '钢琴教育', monthlyHours: 40, rating: 4.8, ratingCount: 32 } })
  const t2 = await prisma.teacher.upsert({ where: { id: 't2' }, update: {}, create: { id: 't2', name: '李老师', gender: '男', phone: '13800001002', email: 'li@test.com', subjects: '数学', bio: '15年数学教学经验', employmentType: 'FULL_TIME', education: '博士', university: '北京大学', major: '基础数学', monthlyHours: 38, rating: 4.9, ratingCount: 28 } })
  const t3 = await prisma.teacher.upsert({ where: { id: 't3' }, update: {}, create: { id: 't3', name: '张老师', gender: '女', phone: '13800001003', email: 'zhang@test.com', subjects: '英语', bio: '8年英语教学经验', employmentType: 'FULL_TIME', education: '硕士', university: '北京外国语大学', major: '英语语言文学', monthlyHours: 35, rating: 4.6, ratingCount: 24 } })
  const t4 = await prisma.teacher.upsert({ where: { id: 't4' }, update: {}, create: { id: 't4', name: '赵老师', gender: '男', phone: '13800001004', email: 'zhao@test.com', subjects: '编程', bio: '5年少儿编程教学经验', employmentType: 'PART_TIME', education: '本科', university: '清华大学', major: '计算机科学', monthlyHours: 20, rating: 4.7, ratingCount: 15 } })
  const t5 = await prisma.teacher.upsert({ where: { id: 't5' }, update: {}, create: { id: 't5', name: '陈老师', gender: '女', phone: '13800001005', email: 'chen@test.com', subjects: '美术', bio: '12年美术教学经验', employmentType: 'PART_TIME', education: '硕士', university: '中国美术学院', major: '油画', monthlyHours: 24, rating: 4.5, ratingCount: 18 } })
  // Teacher for the new pinyin account
  await prisma.teacher.upsert({ where: { id: 't6' }, update: {}, create: { id: 't6', name: '胡思同', gender: '男', phone: '13800001006', email: 'husitong@tea.com', subjects: '数学', bio: '8年数学教学经验', employmentType: 'FULL_TIME', education: '硕士', university: '南京大学', major: '应用数学', monthlyHours: 36, rating: 4.6, ratingCount: 20 } })

  const c1 = await prisma.course.upsert({ where: { id: 'c1' }, update: {}, create: { id: 'c1', name: '钢琴基础班', subject: '音乐', pricePerLesson: 3800, lessonMinutes: 90, teacherId: t1.id } })
  const c2 = await prisma.course.upsert({ where: { id: 'c2' }, update: {}, create: { id: 'c2', name: '数学提高班', subject: '数学', pricePerLesson: 2800, lessonMinutes: 90, teacherId: t2.id } })
  const c3 = await prisma.course.upsert({ where: { id: 'c3' }, update: {}, create: { id: 'c3', name: '英语口语班', subject: '英语', pricePerLesson: 3200, lessonMinutes: 90, teacherId: t3.id } })
  const c4 = await prisma.course.upsert({ where: { id: 'c4' }, update: {}, create: { id: 'c4', name: '编程Scratch', subject: '编程', pricePerLesson: 4200, lessonMinutes: 60, teacherId: t4.id } })
  const c5 = await prisma.course.upsert({ where: { id: 'c5' }, update: {}, create: { id: 'c5', name: '美术素描', subject: '美术', pricePerLesson: 2800, lessonMinutes: 120, teacherId: t5.id } })

  // Create parent users
  const parentHash = await bcrypt.hash('123456', 10)
  const parent1 = await prisma.user.upsert({
    where: { email: 'parent1@test.com' },
    update: { password: parentHash },
    create: { email: 'parent1@test.com', password: parentHash, name: '张爸爸', role: 'parent', status: 'active', division: 'JUNIOR' },
  })
  const parent2 = await prisma.user.upsert({
    where: { email: 'parent2@test.com' },
    update: { password: parentHash },
    create: { email: 'parent2@test.com', password: parentHash, name: '李妈妈', role: 'parent', status: 'active', division: 'JUNIOR' },
  })

  // Create students linked to parents
  const s1 = await prisma.student.upsert({ where: { id: 's1' }, update: {}, create: { id: 's1', name: '张三', phone: '13900001001', gender: '男', grade: '高一', school: '石家庄一中', status: 'ACTIVE', source: '试听', remainHours: 24, totalHours: 56, tags: '["钢琴","乐理"]', parentId: parent1.id, mainTeacherId: t1.id } })
  const s2 = await prisma.student.upsert({ where: { id: 's2' }, update: {}, create: { id: 's2', name: '李四', phone: '13900001002', gender: '女', grade: '初三', school: '衡水中学', status: 'ACTIVE', source: '转介绍', remainHours: 18, totalHours: 42, tags: '["数学"]', parentId: parent2.id, mainTeacherId: t2.id } })
  const s3 = await prisma.student.upsert({ where: { id: 's3' }, update: {}, create: { id: 's3', name: '王五', phone: '13900001003', gender: '男', grade: '高二', school: '唐山一中', status: 'TRIAL', source: '线上', remainHours: 4, totalHours: 4, tags: '["英语"]', parentId: parent1.id } })
  const s4 = await prisma.student.upsert({ where: { id: 's4' }, update: {}, create: { id: 's4', name: '赵六', phone: '13900001004', gender: '女', grade: '初二', school: '保定二中', status: 'ACTIVE', source: '线下', remainHours: 0, totalHours: 32, tags: '["编程"]', parentId: parent2.id, mainTeacherId: t4.id } })
  const s5 = await prisma.student.upsert({ where: { id: 's5' }, update: {}, create: { id: 's5', name: '孙七', phone: '13900001005', gender: '男', grade: '高一', school: '邢台一中', status: 'TRIAL', source: '试听', remainHours: 8, totalHours: 8, tags: '["美术"]', parentId: parent1.id, mainTeacherId: t5.id } })

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
