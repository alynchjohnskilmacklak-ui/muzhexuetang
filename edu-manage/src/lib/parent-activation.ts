import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { PrismaClient } from '@prisma/client'

const TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

export function hashActivationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function isStrongActivationPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)
}

export async function issueParentActivationToken(
  db: PrismaClient,
  input: { parentUserId: string; createdById: string },
) {
  const parent = await db.user.findFirst({
    where: { id: input.parentUserId, role: 'parent', status: { not: 'deleted' } },
    select: { id: true, email: true, name: true, division: true },
  })
  if (!parent) throw new Error('家长账号不存在')
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashActivationToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS)
  await db.$transaction([
    db.parentActivationToken.updateMany({
      where: { parentUserId: parent.id, usedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    db.parentActivationToken.create({
      data: { tokenHash, parentUserId: parent.id, createdById: input.createdById, expiresAt },
    }),
  ])
  return { token, expiresAt, parent }
}

export async function inspectParentActivationToken(db: PrismaClient, token: string) {
  const record = await db.parentActivationToken.findUnique({
    where: { tokenHash: hashActivationToken(token) },
    include: {
      parentUser: {
        select: {
          id: true,
          email: true,
          name: true,
          division: true,
          students: {
            where: { status: { not: 'ARCHIVED' } },
            select: { id: true, name: true, grade: true },
            orderBy: { name: 'asc' },
          },
        },
      },
    },
  })
  if (!record || record.usedAt || record.revokedAt || record.expiresAt <= new Date()) return null
  return record
}

export async function activateParentAccount(
  db: PrismaClient,
  input: { token: string; password: string },
) {
  if (!isStrongActivationPassword(input.password)) {
    throw new Error('密码至少8位，且需要同时包含字母和数字')
  }
  const record = await inspectParentActivationToken(db, input.token)
  if (!record) throw new Error('激活链接无效或已过期')
  const password = await bcrypt.hash(input.password, 12)
  const now = new Date()
  await db.$transaction(async (tx) => {
    const claimed = await tx.parentActivationToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    })
    if (claimed.count !== 1) throw new Error('激活链接已被使用')
    await tx.user.update({
      where: { id: record.parentUserId },
      data: { password, status: 'active', currentSessionToken: null },
    })
  })
  return {
    email: record.parentUser.email,
    division: record.parentUser.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR',
  }
}
