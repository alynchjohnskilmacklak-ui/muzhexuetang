import { prisma } from '@/lib/prisma'
import { chineseToPinyin } from '@/lib/pinyin'

export const MOOD_META = {
  GREAT: { label: '非常棒', icon: '😄', color: '#27a644' },
  GOOD: { label: '不错', icon: '🙂', color: '#5e6ad2' },
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

export async function resolveTeacherForUser(user: { id: string; email?: string | null; name?: string | null; role?: string | null }) {
  const loginEmail = user.email?.toLowerCase() || ''
  const teacher = await prisma.teacher.findFirst({
    where: {
      status: { not: 'RESIGNED' },
      OR: [
        user.email ? { email: user.email } : {},
        user.name ? { name: user.name } : {},
      ].filter((item) => Object.keys(item).length > 0),
    },
  })

  if (teacher) return teacher
  if (loginEmail.endsWith('@tea.com')) {
    const teachers = await prisma.teacher.findMany({
      where: { status: { not: 'RESIGNED' } },
    })
    const matched = teachers.find((item) => `${chineseToPinyin(item.name)}@tea.com` === loginEmail)
    if (matched) return matched
  }
  if (user.role === 'admin') {
    return prisma.teacher.findFirst({ where: { status: { not: 'RESIGNED' } }, orderBy: { createdAt: 'asc' } })
  }
  return null
}
