import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = async (pw: string) => bcrypt.hash(pw, 12)

  // 1) 教师端 husitong@tea.com：绑定一个教师，拥有测试班级
  const teacher = await prisma.teacher.upsert({
    where: { phone: '13800002222' },
    update: {},
    create: {
      name: '胡老师',
      phone: '13800002222',
      email: 'husitong@tea.com',
      subjects: JSON.stringify(['数学', '语文', '英语']),
      division: 'JUNIOR',
      status: 'ACTIVE',
    },
  })
  await prisma.user.upsert({
    where: { email: 'husitong@tea.com' },
    update: { password: await hash('husitong'), teacherId: teacher.id, role: 'teacher', status: 'active' },
    create: {
      email: 'husitong@tea.com',
      password: await hash('husitong'),
      name: '胡老师',
      role: 'teacher',
      division: 'JUNIOR',
      status: 'active',
      teacherId: teacher.id,
    },
  })

  // 2) 管理端 renwentao@nuc.com
  await prisma.user.upsert({
    where: { email: 'renwentao@nuc.com' },
    update: { password: await hash('ren031213'), role: 'admin', status: 'active', division: 'ALL' },
    create: {
      email: 'renwentao@nuc.com',
      password: await hash('ren031213'),
      name: '任文涛',
      role: 'admin',
      division: 'ALL',
      status: 'active',
    },
  })

  // 3) 家长端 mazichen@st.com：绑定牛博研、马子墨两个学生（同家长两个孩子场景）
  const parent = await prisma.user.upsert({
    where: { email: 'mazichen@st.com' },
    update: { password: await hash('mazichen'), role: 'parent', status: 'active', division: 'JUNIOR' },
    create: {
      email: 'mazichen@st.com',
      password: await hash('mazichen'),
      name: '马家长',
      role: 'parent',
      division: 'JUNIOR',
      status: 'active',
    },
  })
  for (const sid of ['test-student-1', 'test-student-2']) {
    await prisma.student.update({ where: { id: sid }, data: { parentId: parent.id } })
  }

  // 4) 把测试班级与课程移交 husitong 教师（teacherId 与 ClassGroupTeacher 关联）
  await prisma.classGroup.updateMany({ where: { id: 'test-group-math' }, data: { teacherId: teacher.id } })
  await prisma.classLesson.updateMany({ where: { groupId: 'test-group-math' }, data: { teacherId: teacher.id } })
  await prisma.classGroupTeacher.upsert({
    where: { groupId_teacherId_subject: { groupId: 'test-group-math', teacherId: teacher.id, subject: '数学' } },
    update: {},
    create: { groupId: 'test-group-math', teacherId: teacher.id, subject: '数学', role: 'SUBJECT' },
  })

  console.log('真实账号已种入本地测试库:')
  console.log('  管理端 renwentao@nuc.com / ren031213')
  console.log('  教师端 husitong@tea.com / husitong')
  console.log('  家长端 mazichen@st.com / mazichen（绑定牛博研、马子墨）')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
