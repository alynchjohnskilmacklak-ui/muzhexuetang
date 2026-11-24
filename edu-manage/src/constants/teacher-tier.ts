export type TeacherTier = 'MANAGER' | 'ELITE' | 'SENIOR' | 'EXPERIENCED' | 'NEW'

export const TEACHER_TIERS: TeacherTier[] = ['MANAGER', 'ELITE', 'SENIOR', 'EXPERIENCED', 'NEW']

export interface TeacherTierTheme {
  label: string
  name: string
  roleTag: string
  bg: string
  border: string
  accent: string
  gold?: string
  primary: string
  secondary: string
  heroBg: string
  patternType: 'elite' | 'senior' | 'experienced' | 'new' | 'manager'
  glowColor: string
  motto: string
  shadow: string
  avatarHalo: string
  badgeBg: string
  badgeColor: string
  badgeBorder: string
  badgeShadow: string
  kpiBg: string
  kpiBorder: string
  kpiHighlight: string
  kpiNumberGradient: string
  kpiWatermarkColor: string
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
    label: '管理教师',
    name: '管理教师',
    roleTag: '教务管理 · 教学督导',
    bg: '#F0EDF8',
    border: '1px solid rgba(124, 107, 196, 0.6)',
    accent: '#FFD700',
    gold: '#E5C07B',
    primary: '#4C3FA8',
    secondary: '#7C6BC4',
    heroBg: 'linear-gradient(135deg, #180F3E 0%, #2E1E6B 50%, #45338D 100%)',
    patternType: 'manager',
    glowColor: 'rgba(167, 139, 250, 0.3)',
    motto: '统筹教务全局，以严谨督导筑牢学堂教学基石。',
    shadow: '0 16px 42px rgba(24, 15, 62, 0.5), inset 0 1px 0 rgba(237, 233, 254, 0.25)',
    avatarHalo: '0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 4.5px rgba(255, 215, 0, 0.9), 0 0 18px rgba(255, 215, 0, 0.5)',
    badgeBg: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
    badgeColor: '#1E1B4B',
    badgeBorder: '1px solid rgba(255, 248, 230, 0.8)',
    badgeShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
    kpiBg: 'rgba(255, 255, 255, 0.1)',
    kpiBorder: '1px solid rgba(167, 139, 250, 0.35)',
    kpiHighlight: 'inset 0 1px 0 rgba(237, 233, 254, 0.35), 0 4px 14px rgba(0, 0, 0, 0.2)',
    kpiNumberGradient: 'linear-gradient(180deg, #FFFFFF 15%, #FDE68A 75%, #F59E0B 100%)',
    kpiWatermarkColor: 'rgba(167, 139, 250, 0.25)',
  },
  ELITE: {
    label: '牧哲学堂专属教师',
    name: '专属教师',
    roleTag: '专属名师 · 招牌品质',
    bg: '#0E2E2A',
    border: '1px solid rgba(201, 164, 92, 0.75)',
    accent: '#C9A45C',
    gold: '#C9A45C',
    primary: '#0D3732',
    secondary: '#195B52',
    heroBg: 'linear-gradient(135deg, #061F1B 0%, #0D3732 50%, #164D43 100%)',
    patternType: 'elite',
    glowColor: 'rgba(201, 164, 92, 0.36)',
    motto: '招牌名师 · 守正出奇，以师道尊严引领万千桃李。',
    shadow: '0 16px 44px rgba(6, 31, 27, 0.55), inset 0 1px 0 rgba(255, 248, 230, 0.32)',
    avatarHalo: '0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 4.5px rgba(201, 164, 92, 0.95), 0 0 18px rgba(201, 164, 92, 0.6)',
    badgeBg: 'linear-gradient(135deg, #F8E7C0 0%, #D8B467 50%, #B89246 100%)',
    badgeColor: '#0A2925',
    badgeBorder: '1px solid rgba(255, 248, 230, 0.85)',
    badgeShadow: '0 2px 10px rgba(201, 164, 92, 0.5)',
    kpiBg: 'rgba(201, 164, 92, 0.12)',
    kpiBorder: '1px solid rgba(201, 164, 92, 0.45)',
    kpiHighlight: 'inset 0 1px 0 rgba(246, 233, 200, 0.5), 0 4px 16px rgba(0, 0, 0, 0.25)',
    kpiNumberGradient: 'linear-gradient(180deg, #FFFFFF 15%, #F8E7C0 68%, #D8B467 100%)',
    kpiWatermarkColor: 'rgba(201, 164, 92, 0.28)',
  },
  SENIOR: {
    label: '资深教师',
    name: '资深教师',
    roleTag: '中坚力量 · 深耕教学',
    bg: '#F8F3E7',
    border: '1px solid rgba(245, 158, 11, 0.6)',
    accent: '#F3CE7A',
    gold: '#C9A45C',
    primary: '#14574D',
    secondary: '#1D7A6D',
    heroBg: 'linear-gradient(135deg, #092B25 0%, #134B41 55%, #1B6559 100%)',
    patternType: 'senior',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    motto: '中坚力量 · 深耕教学，以严谨治学铸就过硬学情。',
    shadow: '0 14px 40px rgba(9, 43, 37, 0.48), inset 0 1px 0 rgba(255, 236, 222, 0.26)',
    avatarHalo: '0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 4.5px rgba(245, 158, 11, 0.88), 0 0 16px rgba(245, 158, 11, 0.48)',
    badgeBg: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
    badgeColor: '#1A1201',
    badgeBorder: '1px solid rgba(255, 236, 222, 0.8)',
    badgeShadow: '0 2px 8px rgba(245, 158, 11, 0.42)',
    kpiBg: 'rgba(245, 158, 11, 0.12)',
    kpiBorder: '1px solid rgba(245, 158, 11, 0.38)',
    kpiHighlight: 'inset 0 1px 0 rgba(255, 236, 222, 0.42), 0 4px 14px rgba(0, 0, 0, 0.22)',
    kpiNumberGradient: 'linear-gradient(180deg, #FFFFFF 20%, #FDE68A 75%, #F59E0B 100%)',
    kpiWatermarkColor: 'rgba(245, 158, 11, 0.25)',
  },
  EXPERIENCED: {
    label: '经验教师',
    name: '经验教师',
    roleTag: '扎实教学 · 班课骨干',
    bg: '#FFF7F1',
    border: '1px solid rgba(56, 189, 248, 0.55)',
    accent: '#FFA07A',
    primary: '#267461',
    secondary: '#359B82',
    heroBg: 'linear-gradient(135deg, #0C342C 0%, #19584C 60%, #206E5F 100%)',
    patternType: 'experienced',
    glowColor: 'rgba(56, 189, 248, 0.26)',
    motto: '扎实教学 · 班课骨干，以耐性温情呵护每一份成长。',
    shadow: '0 14px 36px rgba(12, 52, 44, 0.42), inset 0 1px 0 rgba(224, 242, 254, 0.24)',
    avatarHalo: '0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 4.5px rgba(56, 189, 248, 0.85), 0 0 14px rgba(56, 189, 248, 0.42)',
    badgeBg: 'linear-gradient(135deg, #BAE6FD 0%, #38BDF8 100%)',
    badgeColor: '#082F49',
    badgeBorder: '1px solid rgba(224, 242, 254, 0.8)',
    badgeShadow: '0 2px 8px rgba(56, 189, 248, 0.38)',
    kpiBg: 'rgba(56, 189, 248, 0.1)',
    kpiBorder: '1px solid rgba(56, 189, 248, 0.32)',
    kpiHighlight: 'inset 0 1px 0 rgba(224, 242, 254, 0.38), 0 4px 14px rgba(0, 0, 0, 0.2)',
    kpiNumberGradient: 'linear-gradient(180deg, #FFFFFF 22%, #BAE6FD 75%, #38BDF8 100%)',
    kpiWatermarkColor: 'rgba(56, 189, 248, 0.22)',
  },
  NEW: {
    label: '新晋教师',
    name: '新晋教师',
    roleTag: '活力新锐 · 蓬勃成长',
    bg: '#F7FBF8',
    border: '1px solid rgba(74, 222, 128, 0.52)',
    accent: '#6FE3B4',
    primary: '#3D8A6F',
    secondary: '#56B392',
    heroBg: 'linear-gradient(135deg, #134537 0%, #1D5E4C 60%, #277962 100%)',
    patternType: 'new',
    glowColor: 'rgba(74, 222, 128, 0.24)',
    motto: '活力新锐 · 蓬勃成长，以赤诚初心点亮求知星火。',
    shadow: '0 12px 34px rgba(19, 69, 55, 0.38), inset 0 1px 0 rgba(220, 252, 231, 0.22)',
    avatarHalo: '0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 4.5px rgba(74, 222, 128, 0.85), 0 0 14px rgba(74, 222, 128, 0.38)',
    badgeBg: 'linear-gradient(135deg, #BBF7D0 0%, #4ADE80 100%)',
    badgeColor: '#052E16',
    badgeBorder: '1px solid rgba(220, 252, 231, 0.8)',
    badgeShadow: '0 2px 8px rgba(74, 222, 128, 0.35)',
    kpiBg: 'rgba(74, 222, 128, 0.1)',
    kpiBorder: '1px solid rgba(74, 222, 128, 0.28)',
    kpiHighlight: 'inset 0 1px 0 rgba(220, 252, 231, 0.32), 0 4px 14px rgba(0, 0, 0, 0.18)',
    kpiNumberGradient: 'linear-gradient(180deg, #FFFFFF 28%, #DCFCE7 75%, #4ADE80 100%)',
    kpiWatermarkColor: 'rgba(74, 222, 128, 0.2)',
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
    headerBg: '#0D3732', headerFg: '#F6E9C8', headerBorder: 'rgba(201,164,92,.4)',
    siderBg: '#0D3732', siderFg: '#F6E9C8', siderBorder: 'rgba(201,164,92,.32)',
    menuSelectedBg: 'rgba(201,164,92,.32)', menuSelectedFg: '#F6E9C8',
      mainBg: '#F6F2E9',
    dark: true,
},
  SENIOR: {
    headerBg: '#14574D', headerFg: '#F6E9C8', headerBorder: 'rgba(201,164,92,.35)',
    siderBg: '#EFE2BE', siderFg: '#14574D', siderBorder: 'rgba(201,164,92,.30)',
    menuSelectedBg: '#EFE2BE', menuSelectedFg: '#14574D',
      mainBg: '#F8F3E7',
    dark: true,
},
  EXPERIENCED: {
    headerBg: '#267461', headerFg: '#FFFFFF', headerBorder: 'rgba(255,255,255,.20)',
    siderBg: '#DAECE4', siderFg: '#267461', siderBorder: 'rgba(38,116,97,.26)',
    menuSelectedBg: '#DAECE4', menuSelectedFg: '#1F5C4C',
      mainBg: '#F4F9F6',
    dark: false,
},
  NEW: {
    headerBg: '#3D8A6F', headerFg: '#FFFFFF', headerBorder: 'rgba(255,255,255,.20)',
    siderBg: '#D8EAE2', siderFg: '#3D8A6F', siderBorder: 'rgba(61,138,111,.26)',
    menuSelectedBg: '#D8EAE2', menuSelectedFg: '#2E6E58',
      mainBg: '#F7FBF8',
    dark: false,
},
}
