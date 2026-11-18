export type TeacherTier = 'MANAGER' | 'ELITE' | 'SENIOR' | 'EXPERIENCED' | 'NEW'

export const TEACHER_TIERS: TeacherTier[] = ['MANAGER', 'ELITE', 'SENIOR', 'EXPERIENCED', 'NEW']

export interface TeacherTierTheme {
  label: string
  bg: string
  border: string
  accent: string
  gold?: string
}

/** 等级优先级：数值越大越优先展示给家长 */
export const TIER_RANK: Record<TeacherTier, number> = {
  MANAGER: 4,
  ELITE: 3,
  SENIOR: 2,
  EXPERIENCED: 1,
  NEW: 0,
}

export const TIER_THEME: Record<TeacherTier, TeacherTierTheme> = {
  MANAGER: {
    label: '管理',
    bg: '#F0EDF8',
    border: '#7C6BC4',
    accent: '#4C3FA8',
    gold: '#7C6BC4',
  },
  ELITE: {
    label: '牧哲学堂专属教师',
    bg: '#0E2E2A',
    border: '#C9A45C',
    accent: '#C9A45C',
    gold: '#C9A45C',
  },
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
  if (level === 'MANAGER' || level === 'ELITE' || level === 'SENIOR' || level === 'EXPERIENCED') return level
  return 'NEW'
}

export const TIER_WELCOME: Record<TeacherTier, { title: string; body: string }> = {
  MANAGER: {
    title: '{name}老师，欢迎回来。',
    body: '您是牧哲学堂的管理老师，教务安排与教学品质由您把关。今天也辛苦了！',
  },
  ELITE: {
    title: '{name}老师，欢迎回来。',
    body: '您是本校区专属教师，代表牧哲学堂的招牌教学品质，感谢您一直以来的坚守！',
  },
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
  MANAGER: ['教务权限优先', '专属通道 · 第一时间响应', '子女/亲属 1对1 辅导 8 小时/学期'],
  ELITE: ['预支工资绿色通道 · 优先审批', '专属通道 · 第一时间响应', '子女/亲属 1对1 辅导 8 小时/学期 · 可指定教师'],
  NEW: ['工作日饮品畅饮', '子女/亲属 1对1 辅导 2 小时/学期', '入职导师一对一带教'],
  EXPERIENCED: ['工资可申请提前预支', '教务问题优先响应', '子女/亲属 1对1 辅导 4 小时/学期'],
  SENIOR: ['预支工资绿色通道 · 优先审批', '专属通道 · 第一时间响应', '子女/亲属 1对1 辅导 6 小时/学期 · 可指定教师'],
}

/** 教师端应用主题：每等级一套（Header/Sider/菜单/文字），保证深色底白字或金字可读 */
export interface TeacherAppTheme {
  headerBg: string
  headerFg: string
  headerBorder: string
  siderBg: string
  siderFg: string
  siderBorder: string
  menuSelectedBg: string
  menuSelectedFg: string
  mainBg: string
  dark: boolean
}

export const TIER_APP: Record<TeacherTier, TeacherAppTheme> = {
  MANAGER: {
    headerBg: '#4C3FA8', headerFg: '#FFFFFF', headerBorder: 'rgba(255,255,255,.16)',
    siderBg: '#F0EDF8', siderFg: '#4C3FA8', siderBorder: 'rgba(124,107,196,.25)',
    menuSelectedBg: '#E2D9F4', menuSelectedFg: '#3C2F94',
      mainBg: '#F0EDF8',
    dark: false,
},
  ELITE: {
    headerBg: '#0E2E2A', headerFg: '#F6E9C8', headerBorder: 'rgba(201,164,92,.4)',
    siderBg: '#0E2E2A', siderFg: '#F6E9C8', siderBorder: 'rgba(201,164,92,.32)',
    menuSelectedBg: 'rgba(201,164,92,.20)', menuSelectedFg: '#F6E9C8',
      mainBg: '#F6F2E9',
    dark: true,
},
  SENIOR: {
    headerBg: '#123C35', headerFg: '#F6E9C8', headerBorder: 'rgba(201,164,92,.35)',
    siderBg: '#F8F3E7', siderFg: '#123C35', siderBorder: 'rgba(201,164,92,.28)',
    menuSelectedBg: '#EFE1C2', menuSelectedFg: '#123C35',
      mainBg: '#F8F3E7',
    dark: true,
},
  EXPERIENCED: {
    headerBg: '#E8784A', headerFg: '#FFFFFF', headerBorder: 'rgba(255,255,255,.22)',
    siderBg: '#FFF7F1', siderFg: '#C05C30', siderBorder: 'rgba(242,181,143,.40)',
    menuSelectedBg: '#FCE3D4', menuSelectedFg: '#C04E20',
      mainBg: '#FFF7F1',
    dark: false,
},
  NEW: {
    headerBg: '#3E8E6E', headerFg: '#FFFFFF', headerBorder: 'rgba(255,255,255,.20)',
    siderBg: '#F7FBF8', siderFg: '#2C6E52', siderBorder: 'rgba(217,239,227,.60)',
    menuSelectedBg: '#D9EFE3', menuSelectedFg: '#25604A',
      mainBg: '#F7FBF8',
    dark: false,
},
}
