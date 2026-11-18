/**
 * Usage:
 * ADMIN_EMAIL=xxx@example.com ADMIN_PASSWORD=yourpassword ADMIN_NAME=张三 npx tsx scripts/create-admin.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

async function main() {
  const activeAdmin = await prisma.user.findFirst({
    where: { role: 'admin', status: 'active' },
    select: { id: true },
  })

  if (activeAdmin) {
    console.log('已存在管理员账号，请通过系统设置页面管理')
    process.exit(0)
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || ''
  const name = process.env.ADMIN_NAME?.trim()

  if (!email) fail('缺少环境变量 ADMIN_EMAIL')
  if (!password) fail('缺少环境变量 ADMIN_PASSWORD')
  if (!name) fail('缺少环境变量 ADMIN_NAME')
  if (password.length < 8) fail('ADMIN_PASSWORD 至少需要 8 位')

  const passwordHash = await bcrypt.hash(password, 12)
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: passwordHash,
      name,
      role: 'admin',
      status: 'active',
    },
    create: {
      email,
      password: passwordHash,
      name,
      role: 'admin',
      status: 'active',
    },
    select: {
      email: true,
      name: true,
    },
  })

  console.log('管理员账号创建成功')
  console.log(`邮箱：${admin.email}`)
  console.log(`姓名：${admin.name}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
