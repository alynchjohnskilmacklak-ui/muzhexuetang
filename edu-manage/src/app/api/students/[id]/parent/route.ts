import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import pinyin from 'pinyin'
import { apiHandler } from '@/lib/api-handler'

function chineseToPinyin(name: string): string {
  const result = pinyin(name, { style: 0 })
  return result.flat().join('').toLowerCase()
}

export const POST = apiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const customEmail: string | undefined = body.email
  const customPassword: string | undefined = body.password

  const py = chineseToPinyin(student.name)
  const email = customEmail || `${py}@st.com`
  const plainPwd = customPassword || py
  const hashed = await bcrypt.hash(plainPwd, 10)

  const parentUser = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, status: 'active' },
    create: {
      email,
      password: hashed,
      name: student.parentName || `${student.name}家长`,
      role: 'parent',
    },
  })

  await prisma.student.update({
    where: { id },
    data: { parentId: parentUser.id, parentUserId: parentUser.id },
  })

  return NextResponse.json({ email, password: plainPwd, parentId: parentUser.id })
})
