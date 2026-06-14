import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ── 管理员账号 ──────────────────────────────────────────────
  // 超级管理员 — 可进入任意学部
  const renHash = await bcrypt.hash('ren031213', 10)
  await prisma.user.upsert({
    where: { email: 'renwentao@nuc.com' },
    update: { password: renHash, name: '任文涛', role: 'admin', status: 'active', division: 'ALL' },
    create: { email: 'renwentao@nuc.com', password: renHash, name: '任文涛', role: 'admin', status: 'active', division: 'ALL' },
  })

  // 初中部管理员
  const maHash = await bcrypt.hash('mashaokun', 10)
  await prisma.user.upsert({
    where: { email: 'mashaokun@nuc.com' },
    update: { password: maHash, name: '马少坤', role: 'admin', status: 'active', division: 'JUNIOR' },
    create: { email: 'mashaokun@nuc.com', password: maHash, name: '马少坤', role: 'admin', status: 'active', division: 'JUNIOR' },
  })

  // ── 真实教师 ────────────────────────────────────────────────
  const huHash = await bcrypt.hash('husitong', 10)
  await prisma.user.upsert({
    where: { email: 'husitong@tea.com' },
    update: { password: huHash, name: '胡思同', role: 'teacher', status: 'active', division: 'JUNIOR' },
    create: { email: 'husitong@tea.com', password: huHash, name: '胡思同', role: 'teacher', status: 'active', division: 'JUNIOR' },
  })
  await prisma.teacher.upsert({
    where: { id: 't6' },
    update: { name: '胡思同', email: 'husitong@tea.com', phone: '13800001006', status: 'ACTIVE', division: 'JUNIOR' },
    create: { id: 't6', name: '胡思同', gender: '男', phone: '13800001006', email: 'husitong@tea.com', subjects: '数学', bio: '8年数学教学经验', employmentType: 'FULL_TIME', education: '硕士', university: '南京大学', major: '应用数学', monthlyHours: 36, division: 'JUNIOR' },
  })

  console.log('Seed complete')
  console.log('  超级管理员: renwentao@nuc.com / ren031213  (division=ALL)')
  console.log('  管理员:     mashaokun@nuc.com  / mashaokun (division=JUNIOR)')
  console.log('  教师:       husitong@tea.com   / husitong (division=JUNIOR)')
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
