import bcrypt from 'bcryptjs'
import { requireRole } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { ValidationError } from '@/lib/api-validate'

export interface DangerAuthBody {
  password: string
  confirmPhrase: string
  expectedPhrase: string
}

export interface DangerAuthResult {
  userId: string
  userEmail: string
  userName: string
}

/**
 * 统一危险操作鉴权：
 * 1. 仅 SUPER_ADMIN
 * 2. 校验本人登录密码（bcrypt）
 * 3. 逐字确认短语防手滑
 *
 * 绝不硬编码密码 — repo 是公开的。
 */
export async function assertDangerAuth(body: DangerAuthBody): Promise<DangerAuthResult> {
  const user = await requireRole(['SUPER_ADMIN'])

  if (!body.password || typeof body.password !== 'string' || body.password.trim().length === 0) {
    throw new ValidationError('请输入密码')
  }

  if (!body.expectedPhrase || typeof body.expectedPhrase !== 'string') {
    throw new ValidationError('缺少确认短语')
  }

  if (body.confirmPhrase !== body.expectedPhrase) {
    throw new ValidationError('确认短语不匹配，请重新输入')
  }

  const prisma = await getRequestPrisma()
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true, email: true, name: true },
  })

  if (!dbUser?.password) {
    throw new Error('账号无密码')
  }

  const ok = await bcrypt.compare(body.password, dbUser.password)
  if (!ok) {
    throw new ValidationError('密码错误')
  }

  return {
    userId: user.id,
    userEmail: dbUser.email ?? '',
    userName: dbUser.name ?? '',
  }
}
