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

  console.log('账号信息:')
  console.log(`  email:    ${user.email}`)
  console.log(`  name:     ${user.name}`)
  console.log(`  role:     ${user.role}`)
  console.log(`  status:   ${user.status}`)
  console.log(`  division: ${user.division}`)

  if (user.division !== 'ALL') {
    console.error('\n错误: division 不是 ALL，修复失败！请检查数据库。')
    process.exit(1)
  }
  console.log('\n超级管理员修复成功。')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
