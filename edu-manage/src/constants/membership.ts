// 牧哲学堂 会员等级配置
// 单一数据源：学员表单、学员卡片、家长端欢迎语/服务卡片、管理端均引用此文件。
// 颜色与文案均按既定方案设定，控制克制、不浮夸。

export type MembershipLevel = 'NORMAL' | 'VIP' | 'SVIP'

export const MEMBERSHIP_LEVELS: MembershipLevel[] = ['NORMAL', 'VIP', 'SVIP']

export interface MembershipTheme {
  /** 等级显示名 */
  label: string
  /** 列表卡片/家长端是否显示等级徽标（普通用户不显示，避免视觉噪音） */
  badge: string | null
  /** 配色 */
  bg: string
  border: string
  accent: string
  text: string
  /** SVIP 专属点缀金色（仅 SVIP 有） */
  gold?: string
}

/** 三档配色（贴合首页暖色风格，普通=浅绿、VIP=品牌橙、SVIP=深墨绿+哑光金） */
export const MEMBERSHIP_THEME: Record<MembershipLevel, MembershipTheme> = {
  NORMAL: {
    label: '普通',
    badge: null,
    bg: '#F7FBF8',
    border: '#D9EFE3',
    accent: '#3E8E6E',
    text: '#285247',
  },
  VIP: {
    label: 'VIP',
    badge: 'VIP',
    bg: '#FFF7F1',
    border: '#F2B58F',
    accent: '#F0875B',
    text: '#2F3F38',
  },
  SVIP: {
    label: 'SVIP',
    badge: 'SVIP',
    bg: '#F8F3E7',
    border: '#C9A45C',
    accent: '#123C35',
    text: '#123C35',
    gold: '#C9A45C',
  },
}

/** 学员表单下拉选项 */
export const MEMBERSHIP_OPTIONS = MEMBERSHIP_LEVELS.map((level) => ({
  value: level,
  label: MEMBERSHIP_THEME[level].label,
}))

/** 安全取值：未知/空值一律按普通处理 */
export function resolveMembership(level?: string | null): MembershipLevel {
  return level === 'VIP' || level === 'SVIP' ? level : 'NORMAL'
}

// ---- 家长端登录后顶部欢迎提示语（{name} 会被替换为学生姓名）----
export const MEMBERSHIP_WELCOME: Record<MembershipLevel, { title: string; body: string }> = {
  NORMAL: {
    title: '亲爱的 {name} 同学家长，欢迎来到牧哲学堂教育管理系统。',
    body: '在这里，您可以实时查看孩子的课程安排、学习反馈与成长记录。牧哲学堂愿与您一起，陪伴孩子稳步提升。',
  },
  VIP: {
    title: '尊敬的 {name} 同学家长，欢迎进入牧哲学堂 VIP 专属服务通道。',
    body: '感谢您对牧哲学堂的信任与选择，我们将为您提供更及时、更细致、更安心的学习服务支持。',
  },
  SVIP: {
    title: '尊敬的 {name} 同学家长，欢迎进入牧哲学堂 SVIP 尊享服务中心。',
    body: '您已开启专属优先服务权益，牧哲学堂将以更高标准、更快响应、更细致陪伴，持续守护孩子的学习成长。',
  },
}

// ---- 家长端首页服务提示卡片（仅 VIP / SVIP 显示，普通用户不显示）----
export const MEMBERSHIP_SERVICE_CARD: Record<'VIP' | 'SVIP', {
  title: string
  body: string
  hotlineLabel: string
  hotline: string
  footer: string
}> = {
  VIP: {
    title: '尊敬的牧哲学堂 VIP 用户，感谢您一直以来的信任与支持。',
    body: '在使用系统过程中，如遇到任何问题，可随时联系我们：',
    hotlineLabel: '服务热线',
    hotline: '15930114500 ｜ 18031264903',
    footer: '我们将第一时间为您处理，确保您的使用体验更加顺畅、安心。',
  },
  SVIP: {
    title: '尊敬的牧哲学堂 SVIP 用户，感谢您成为我们重点服务家庭。',
    body: '您已享有专属优先服务权益，如在课程安排、学习反馈、系统使用或志愿填报等方面遇到任何问题，可随时联系专属服务通道：',
    hotlineLabel: 'SVIP 专属服务热线',
    hotline: '15930114500 ｜ 18031264903',
    footer: '我们将优先响应、专人跟进，为您提供更高效、更安心、更有温度的服务支持。',
  },
}

/** 替换欢迎语中的 {name} 占位符 */
export function fillName(template: string, name: string): string {
  return template.replace(/\{name\}/g, name || '')
}
