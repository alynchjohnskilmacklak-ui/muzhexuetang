/**
 * 检查指定用户账号状态和密码格式。
 *
 * 用法:
 *   npx tsx scripts/check-account.ts mashaokun@nuc.com
 *   npx tsx scripts/check-account.ts  (检查所有用户)
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  const target = process.argv[2]?.trim().toLowerCase()

  const users = target
    ? await prisma.user.findMany({ where: { email: target } })
    : await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })

  if (!users.length) {
    console.log(target ? `未找到用户: ${target}` : '数据库中没有任何用户')
    process.exit(1)
  }

  for (const u of users) {
    const isHashed = u.password.startsWith('$2')
    const hashType = isHashed
      ? u.password.startsWith('$2b') ? 'bcrypt $2b' :
        u.password.startsWith('$2a') ? 'bcrypt $2a' :
        u.password.startsWith('$2y') ? 'bcrypt $2y' : 'bcrypt(unknown)'
      : '明文/非bcrypt'

    console.log([
      `邮箱: ${u.email}`,
      `角色: ${u.role}`,
      `姓名: ${u.name}`,
      `状态: ${u.status}`,
      `密码格式: ${hashType} (${u.password.substring(0, 20)}...)`,
      `创建时间: ${u.createdAt.toISOString()}`,
      `最后登录: ${u.lastLoginAt?.toISOString() || '从未登录'}`,
      `---`,
    ].join('\n'))
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
