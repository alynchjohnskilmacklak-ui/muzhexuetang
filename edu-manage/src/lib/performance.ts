import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { chineseToPinyin } from '@/lib/pinyin'

export const MOOD_META = {
  GREAT: { label: '非常棒', icon: '😄', color: '#27a644' },
  GOOD: { label: '不错', icon: '🙂', color: '#E8784A' },
  OKAY: { label: '一般', icon: '😐', color: '#f5a623' },
  NEEDS_ATTENTION: { label: '需关注', icon: '😟', color: '#e03e2d' },
} as const

export const PERFORMANCE_BADGES = [
  { type: 'STAR_OF_DAY', icon: '⭐', label: '今日之星' },
  { type: 'FAST_PROGRESS', icon: '🚀', label: '进步飞速' },
  { type: 'THINKER', icon: '💡', label: '思维达人' },
  { type: 'HOMEWORK_KING', icon: '📘', label: '作业之王' },
  { type: 'PERSISTENT', icon: '💪', label: '坚持不懈' },
  { type: 'PRECISE', icon: '🎯', label: '精准破题' },
  { type: 'FULL_MARK', icon: '💯', label: '满分出击' },
  { type: 'SHINING', icon: '✨', label: '闪光时刻' },
] as const

export const QUICK_TAGS = [
  '积极发言',
  '专注听讲',
  '作业优秀',
  '进步明显',
  '思维活跃',
  '独立解题',
  '需加强练习',
  '上课走神',
  '状态很好',
  '回答精彩',
  '公式掌握好',
  '举一反三',
]

export const RATING_LABELS = {
  focus: '课堂专注',
  mastery: '知识掌握',
  interaction: '课堂互动',
  homework: '作业情况',
} as const

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
