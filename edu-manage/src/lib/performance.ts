import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { chineseToPinyin } from '@/lib/pinyin'

export { MOOD_META, PERFORMANCE_BADGES, QUICK_TAGS, RATING_LABELS } from '@/lib/mood-meta'

export async function resolveTeacherForUser(
  user: { id: string; email?: string | null; name?: string | null; role?: string | null },
  prismaClient: PrismaClient = prisma,
) {
  const db = prismaClient
  const loginEmail = user.email?.toLowerCase() || ''

  // 最高优先级：通过 User.teacherId 直接绑定（唯一、准确，杜绝姓名误匹配）
  const boundUser = await db.user.findUnique({
    where: { id: user.id },
    select: { teacherId: true },
  })
  if (boundUser?.teacherId) {
    const bound = await db.teacher.findFirst({
      where: { id: boundUser.teacherId, status: { not: 'RESIGNED' } },
    })
    if (bound) return bound
  }

  // 次优先：精确邮箱匹配（不再用姓名兜底，避免同名张冠李戴）
  const teacher = user.email
    ? await db.teacher.findFirst({
        where: { status: { not: 'RESIGNED' }, email: user.email },
      })
    : null

  if (teacher) return teacher
  if (loginEmail.endsWith('@tea.com')) {
    const teachers = await db.teacher.findMany({
      where: { status: { not: 'RESIGNED' } },
    })
    const matched = teachers.find((item) => `${chineseToPinyin(item.name)}@tea.com` === loginEmail)
    if (matched) return matched
  }
  if (user.role === 'admin') {
    return db.teacher.findFirst({ where: { status: { not: 'RESIGNED' } }, orderBy: { createdAt: 'asc' } })
  }
  return null
}
