export type TeacherTier = 'SENIOR' | 'EXPERIENCED' | 'NEW'

export const TEACHER_TIERS: TeacherTier[] = ['SENIOR', 'EXPERIENCED', 'NEW']

export interface TeacherTierTheme {
  label: string
  bg: string
  border: string
  accent: string
  gold?: string
}

export const TIER_THEME: Record<TeacherTier, TeacherTierTheme> = {
  SENIOR: {
    label: '资深教师',
    bg: '#F8F3E7',
    border: '#C9A45C',
    accent: '#123C35',
    gold: '#C9A45C',
  },
  EXPERIENCED: {
    label: '经验教师',
    bg: '#FFF7F1',
    border: '#F2B58F',
    accent: '#E8784A',
  },
  NEW: {
    label: '新晋教师',
    bg: '#F7FBF8',
    border: '#D9EFE3',
    accent: '#3E8E6E',
  },
}

export const TIER_OPTIONS = TEACHER_TIERS.map((level) => ({
  value: level,
  label: TIER_THEME[level].label,
}))

export function resolveTier(level?: string | null): TeacherTier {
  return level === 'SENIOR' || level === 'EXPERIENCED' ? level : 'NEW'
}

export const TIER_WELCOME: Record<TeacherTier, { title: string; body: string }> = {
  SENIOR: {
    title: '{name}老师，欢迎回来。',
    body: '您是牧哲学堂的资深教师，孩子们的每一步成长，都有您深耕的痕迹。今天也请多关照。',
  },
  EXPERIENCED: {
    title: '{name}老师，欢迎回来。',
    body: '感谢您一直以来的扎实付出，课堂因您而更有质量。今天继续加油！',
  },
  NEW: {
    title: '{name}老师，欢迎加入牧哲学堂。',
    body: '每一位好老师都从第一堂课开始。放手去教，遇到问题随时找教学组，我们一起把课上好。',
  },
}

export function fillName(template: string, name: string): string {
  return template.replace(/\{name\}/g, name || '')
}

/** 弹窗里展示的核心福利点（每档3条，完整清单在福利页） */
export const TIER_QUICK_PERKS: Record<TeacherTier, string[]> = {
  NEW: ['工作日饮品畅饮', '子女/亲属 1对1 辅导 2 小时/学期', '入职导师一对一带教'],
  EXPERIENCED: ['工资可申请提前预支', '教务问题优先响应', '子女/亲属 1对1 辅导 4 小时/学期'],
  SENIOR: ['预支工资绿色通道 · 优先审批', '专属通道 · 第一时间响应', '子女/亲属 1对1 辅导 6 小时/学期 · 可指定教师'],
}
