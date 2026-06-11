/**
 * 迁移脚本：将现有教师与 User 账号按 email 规则批量绑定。
 *
 * 规则：教师拼音名@tea.com → User.email 匹配后，设置 User.teacherId = Teacher.id
 *
 * 用法：npx tsx scripts/bind-teacher-users.ts
 */

import { prisma } from '../src/lib/prisma'
import { chineseToPinyin } from '../src/lib/pinyin'

async function main() {
  const teachers = await prisma.teacher.findMany({
    where: { status: { not: 'RESIGNED' } },
    select: { id: true, name: true, phone: true },
  })

  let bound = 0
  let skipped = 0

  for (const teacher of teachers) {
    const pinyinEmail = `${chineseToPinyin(teacher.name)}@tea.com`

    const user = await prisma.user.findFirst({
      where: { email: pinyinEmail, role: 'teacher' },
      select: { id: true, teacherId: true },
    })

    if (!user) {
      console.log(`[SKIP] ${teacher.name} — 未找到匹配的 User 账号 (${pinyinEmail})`)
      skipped++
      continue
    }

    if (user.teacherId) {
      console.log(`[SKIP] ${teacher.name} — User 已绑定 Teacher(${user.teacherId})`)
      skipped++
      continue
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { teacherId: teacher.id },
    })

    console.log(`[BOUND] ${teacher.name} → User(${user.id}) → Teacher(${teacher.id})`)
    bound++
  }

  console.log(`\n完成：绑定 ${bound} 个教师，跳过 ${skipped} 个`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => await prisma.$disconnect())
