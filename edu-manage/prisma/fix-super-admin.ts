/**
 * One-shot fix super admin account: ensure renwentao@nuc.com exists with
 * admin role and active status.
 *
 * Usage: npx tsx prisma/fix-super-admin.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('ren031213', 10)

  const user = await prisma.user.upsert({
    where: { email: 'renwentao@nuc.com' },
    update: { password, name: '任文涛', role: 'admin', status: 'active' },
    create: { email: 'renwentao@nuc.com', password, name: '任文涛', role: 'admin', status: 'active' },
  })

  console.log(`email:  ${user.email}`)
  console.log(`name:   ${user.name}`)
  console.log(`role:   ${user.role}`)
  console.log(`status: ${user.status}`)
  console.log('\nSuper admin account OK.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
