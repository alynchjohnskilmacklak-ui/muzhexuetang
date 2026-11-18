import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { apiHandler } from '@/lib/api-handler'
import { chineseToPinyin } from '@/lib/pinyin'
import { generateTemporaryPassword } from '@/lib/temporary-password'
import { getPasswordPolicyError } from '@/lib/password-policy'

export const POST = apiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const prisma = await getRequestPrisma()
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const actorId = (session.user as { id?: string }).id
  if (!actorId) return NextResponse.json({ error: '登录状态无效，请重新登录' }, { status: 401 })

  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const customEmail: string | undefined = body.email
  const customPassword: string | undefined = body.password

  const py = chineseToPinyin(student.name)
  const email = customEmail || `${py}@st.com`
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing && existing.role !== 'parent') {
    return NextResponse.json({ error: '该账号已被其他角色使用' }, { status: 409 })
  }

  const issuedPassword = existing && !customPassword
    ? null
    : (customPassword || generateTemporaryPassword())
  if (issuedPassword) {
    const passwordError = getPasswordPolicyError(issuedPassword, {
      identifiers: [email, student.name, student.parentName || ''],
    })
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  const parentUser = await prisma.$transaction(async (tx) => {
    const linkedParent = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            status: 'active',
            ...(issuedPassword ? { password: await bcrypt.hash(issuedPassword, 12) } : {}),
          },
        })
      : await tx.user.create({
          data: {
            email,
            password: await bcrypt.hash(issuedPassword!, 12),
            name: student.parentName || `${student.name}家长`,
            role: 'parent',
            division: student.division,
          },
        })

    await tx.student.update({
      where: { id },
      data: { parentId: linkedParent.id, parentUserId: linkedParent.id },
    })
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: existing
          ? (issuedPassword ? 'PASSWORD_RESET_ADMIN' : 'PARENT_ACCOUNT_BOUND')
          : 'PASSWORD_INITIALIZED',
        detail: `为学生 ${student.name} 绑定家长账号 ${email}`,
        entityType: issuedPassword ? 'User' : 'Student',
        entityId: issuedPassword ? linkedParent.id : student.id,
        metadata: issuedPassword ? { source: existing ? 'ADMIN_RESET' : 'STUDENT_PARENT_CREATE' } : undefined,
      },
    })
    return linkedParent
  })

  return NextResponse.json({ email, password: issuedPassword, parentId: parentUser.id })
})
