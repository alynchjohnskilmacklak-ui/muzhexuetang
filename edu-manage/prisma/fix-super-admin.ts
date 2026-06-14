/**
 * 一次性修复超级管理员账号
 *
 * 执行: npx tsx prisma/fix-super-admin.ts
 *
 * 强制将 renwentao@nuc.com 修正为 division=ALL 超级管理员
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('ren031213', 10)

  const user = await prisma.user.upsert({
    where: { email: 'renwentao@nuc.com' },
    update: {
      password,
      name: '任文涛',
      role: 'admin',
      status: 'active',
      division: 'ALL',
    },
    create: {
      email: 'renwentao@nuc.com',
      password,
      name: '任文涛',
      role: 'admin',
      status: 'active',
      division: 'ALL',
    },
  })

  console.log(`renwentao@nuc.com 已修复 → role=${user.role} division=${user.division} status=${user.status}`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
