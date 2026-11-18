import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import pinyin from 'pinyin'

const prisma = new PrismaClient()

function chineseToPinyin(name: string): string {
  const result = pinyin(name, { style: 0 })
  return result.flat().join('').toLowerCase()
}

async function main() {
  const students = await prisma.student.findMany({
    where: { parentId: null, status: { not: 'INACTIVE' } },
  })

  console.log(`共找到 ${students.length} 个未绑定家长账号的学员`)
  let fixed = 0

  for (const student of students) {
    const py = chineseToPinyin(student.name)
    const email = `${py}@st.com`
    const hashed = await bcrypt.hash(py, 10)
    const parentName = student.parentName || `${student.name}家长`

    try {
      const parentUser = await prisma.user.upsert({
        where: { email },
        update: { status: 'active' },
        create: {
          email,
          password: hashed,
          name: parentName,
          role: 'parent',
        },
      })

      await prisma.student.update({
        where: { id: student.id },
        data: {
          parentId: parentUser.id,
          parentUserId: parentUser.id,
        },
      })

      console.log(`✓ ${student.name} → ${email}（密码：${py}）`)
      fixed++
    } catch (e) {
      console.error(`✗ ${student.name} 修复失败:`, e)
    }
  }

  console.log(`\n修复完成，共处理 ${fixed} 个学员`)
  console.log('注意：如有同名学员，他们会共用同一个家长账号，请手动处理')
}

main().finally(() => prisma.$disconnect())
