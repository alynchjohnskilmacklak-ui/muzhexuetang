/**
 * 重置指定用户密码（bcrypt 加密）。
 *
 * 用法：
 *   npx tsx scripts/reset-password.ts mashaokun@nuc.com mashaokun
 *
 * 或者通过环境变量：
 *   RESET_EMAIL=mashaokun@nuc.com RESET_PASSWORD=mashaokun npx tsx scripts/reset-password.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.RESET_EMAIL || process.argv[2] || '').trim().toLowerCase()
  const password = process.env.RESET_PASSWORD || process.argv[3] || ''

  if (!email) {
    console.error('用法: npx tsx scripts/reset-password.ts <邮箱> <新密码>')
    console.error('或:   RESET_EMAIL=xxx RESET_PASSWORD=xxx npx tsx scripts/reset-password.ts')
    process.exit(1)
  }

  if (!password || password.length < 6) {
    console.error('密码至少需要 6 位')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`未找到用户: ${email}`)
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)
  await prisma.user.update({ where: { email }, data: { password: hash } })

  console.log(`✅ 密码已重置`)
  console.log(`   邮箱: ${email}`)
  console.log(`   角色: ${user.role}`)
  console.log(`   姓名: ${user.name}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
