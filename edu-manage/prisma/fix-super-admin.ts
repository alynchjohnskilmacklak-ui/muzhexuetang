/**
 * One-shot fix super admin account: ensure the configured super admin email
 * exists with admin role and active status.
 *
 * Usage:
 *   SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_PASSWORD=... npx tsx prisma/fix-super-admin.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  const plainPassword = process.env.SUPER_ADMIN_PASSWORD
  if (!email || !plainPassword) {
    console.error('请通过环境变量提供 SUPER_ADMIN_EMAIL 与 SUPER_ADMIN_PASSWORD')
    process.exit(1)
  }

  const password = await bcrypt.hash(plainPassword, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { password, role: 'admin', status: 'active', division: 'ALL' },
    create: { email, password, name: '超级管理员', role: 'admin', status: 'active', division: 'ALL' },
  })

  console.log(`email:  ${user.email}`)
  console.log(`name:   ${user.name}`)
  console.log(`role:   ${user.role}`)
  console.log(`status: ${user.status}`)
  console.log('\nSuper admin account OK.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
