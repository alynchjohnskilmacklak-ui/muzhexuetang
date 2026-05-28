import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  let count = 0
  for (const u of users) {
    if (!u.password.startsWith('$2')) {
      const hashed = await bcrypt.hash(u.password, 10)
      await prisma.user.update({ where: { id: u.id }, data: { password: hashed } })
      console.log(`已加密: ${u.email}`)
      count++
    }
  }
  console.log(`迁移完成，共处理 ${count} 个账号`)
}

main().finally(() => prisma.$disconnect())
