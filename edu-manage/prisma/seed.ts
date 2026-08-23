import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 账号凭据一律从环境变量读取，绝不硬编码在源码中（仓库可能公开）。
// 生产环境请勿设置这些变量，避免种入已知口令账号。
async function seedAccount(opts: {
  email?: string
  password?: string
  name: string
  role: 'admin' | 'teacher'
  division: string
  teacherId?: string
}) {
  const email = opts.email?.trim().toLowerCase()
  if (!email || !opts.password) {
    console.warn(`[seed] 跳过「${opts.name}」账号：缺少对应环境变量`)
    return
  }
  const hash = await bcrypt.hash(opts.password, 12)
  await prisma.user.upsert({
    where: { email },
    update: { password: hash, name: opts.name, role: opts.role, status: 'active', division: opts.division },
    create: { email, password: hash, name: opts.name, role: opts.role, status: 'active', division: opts.division },
  })
  if (opts.teacherId) {
    await prisma.user.update({ where: { email }, data: { teacherId: opts.teacherId } })
  }
}

async function main() {
  await seedAccount({
    email: process.env.SEED_SUPER_ADMIN_EMAIL,
    password: process.env.SEED_SUPER_ADMIN_PASSWORD,
    name: '超级管理员',
    role: 'admin',
    division: 'ALL',
  })

  await seedAccount({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
    name: '管理员',
    role: 'admin',
    division: 'JUNIOR',
  })

  // 教师账号（可选）：需同时提供邮箱与密码。
  const teacherEmail = process.env.SEED_TEACHER_EMAIL?.trim().toLowerCase()
  const teacherPassword = process.env.SEED_TEACHER_PASSWORD
  if (teacherEmail && teacherPassword) {
    const teacherId = 't6'
    await seedAccount({ email: teacherEmail, password: teacherPassword, name: '教师', role: 'teacher', division: 'JUNIOR', teacherId })
    await prisma.teacher.upsert({
      where: { id: teacherId },
      update: { email: teacherEmail },
      create: { id: teacherId, name: '教师', gender: '男', phone: '13800001006', email: teacherEmail, subjects: '数学', division: 'JUNIOR' },
    })
  } else {
    console.warn('[seed] 跳过教师账号：缺少 SEED_TEACHER_EMAIL / SEED_TEACHER_PASSWORD')
  }

  // ── 收费类型 ──
  const feeTypes = ['1对1', '班课', '资料费', '其他']
  for (let i = 0; i < feeTypes.length; i++) {
    await prisma.feeType.upsert({ where: { name: feeTypes[i] }, update: { order: i }, create: { name: feeTypes[i], order: i } })
  }

  console.log('Seed complete')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
