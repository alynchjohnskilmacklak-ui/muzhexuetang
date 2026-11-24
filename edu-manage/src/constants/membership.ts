// 牧哲学堂 会员等级配置
// 单一数据源：学员表单、学员卡片、家长端欢迎语/服务卡片、管理端均引用此文件。
// 颜色与文案均按既定方案设定，控制克制、不浮夸。

export type MembershipLevel = 'NORMAL' | 'VIP' | 'SVIP'

/** Only stores the selected student's ID; the server validates it against the signed-in parent. */
export const PARENT_ACTIVE_CHILD_COOKIE = 'mz_parent_active_child'

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

/** A stored child ID is only a preference, never proof that the parent may see that child. */
export function selectParentMembership<T extends { id: string; name: string; membershipLevel?: string | null; recordIds?: readonly string[] }>(
  linkedStudents: T[],
  preferredChildId?: string | null,
) {
  const activeStudent = linkedStudents.find((student) =>
    student.id === preferredChildId || student.recordIds?.includes(preferredChildId || ''),
  ) ?? linkedStudents[0]
  return {
    activeChildId: activeStudent?.id ?? '',
    studentName: activeStudent?.name ?? '',
    membershipLevel: resolveMembership(activeStudent?.membershipLevel),
  }
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

// ---- 家长端首页权益清单卡（三档均显示，内容取自系统权益文案，不另行编造）----
export interface BenefitItem {
  icon: string
  title: string
  desc: string
}

export const MEMBERSHIP_BENEFITS: Record<MembershipLevel, {
  title: string
  items: BenefitItem[]
}> = {
  NORMAL: {
    title: '普通用户 · 基础服务',
    items: [
      { icon: '📋', title: '学习记录查看', desc: '课程安排、考勤记录、学习反馈随时可查' },
      { icon: '💬', title: '学习反馈与建议', desc: '课后课堂表现与知识掌握情况同步' },
      { icon: '☎️', title: '服务电话支持', desc: '15930114500 ｜ 18031264903' },
    ],
  },
  VIP: {
    title: 'VIP 用户 · 专属服务',
    items: [
      { icon: '⚡', title: '优先响应与热线', desc: '问题优先处理、热线优先接听' },
      { icon: '🔍', title: '学习情况重点关注', desc: '老师持续关注阶段学习状态' },
      { icon: '📄', title: '阶段性试卷分析', desc: '结合试卷分析失分与提升方向' },
      { icon: '🖨️', title: '打印权益升级', desc: '复习卷、练习资料免费打印（300 张）' },
      { icon: '🎁', title: '赠送一对一辅导', desc: '每名学生赠送 1 小时任课老师辅导' },
    ],
  },
  SVIP: {
    title: 'SVIP 用户 · 核心陪伴家庭',
    items: [
      { icon: '👑', title: '学习问题优先跟进', desc: '状态波动、薄弱环节优先沟通' },
      { icon: '📊', title: '深度试卷分析', desc: '深挖失分原因与后续提升方向' },
      { icon: '🧭', title: '个性化学习建议', desc: '结合基础与习惯给针对性建议' },
      { icon: '🎯', title: '志愿填报一对一跟进', desc: '中考/高考志愿填报专人服务' },
      { icon: '🔔', title: '重点考试节点提醒', desc: '期中期末、中考高考关键节点提醒' },
    ],
  },
}

// ---- 家长端权益卡底部引导条 ----
export const MEMBERSHIP_UPGRADE: Record<MembershipLevel, { text: string; href: string }> = {
  NORMAL: { text: '升级 VIP · 享优先排课与专属服务', href: '/parent/benefits' },
  VIP: { text: '再进一步 · 解锁 SVIP 深度陪伴', href: '/parent/benefits' },
  SVIP: { text: '您已享有最高级别服务', href: '/parent/benefits' },
}

// ---- 家长端首页头图等级主题（深墨绿 + 哑光金边 + 光带氛围）----
export const MEMBERSHIP_HERO_THEME: Record<MembershipLevel, {
  background: string
  badgeBg: string
  statBg: string
  quoteBg: string
  border?: string
  shadow?: string
  shine?: boolean
  patternType: 'svip' | 'vip' | 'normal'
  glowColor: string
  avatarHalo: string
  statNumberGradient: string
  statBorder: string
  statHighlight: string
  statWatermarkColor: string
  quoteBorder: string
  reportBarBg: string
  reportBarBorder: string
  reportBarShadow: string
  reportIconBg: string
  reportIconColor: string
  reportBtnBg: string
  reportBtnColor: string
  reportBtnShadow: string
}> = {
  NORMAL: {
    background: 'linear-gradient(145deg, #1E5C46 0%, #154534 100%)',
    badgeBg: 'rgba(255,255,255,.22)',
    statBg: 'rgba(255,255,255,.12)',
    quoteBg: 'rgba(255,255,255,.12)',
    border: '1px solid rgba(62,142,110,.4)',
    shadow: '0 12px 32px rgba(21, 69, 52, 0.32), inset 0 1px 0 rgba(255,255,255,.14)',
    shine: true,
    patternType: 'normal',
    glowColor: 'rgba(74, 222, 128, 0.20)',
    avatarHalo: '0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 4.5px rgba(62, 142, 110, 0.75), 0 0 12px rgba(62, 142, 110, 0.35)',
    statNumberGradient: 'linear-gradient(180deg, #FFFFFF 40%, #E6FAF0 100%)',
    statBorder: '1px solid rgba(74, 222, 128, 0.22)',
    statHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 4px 14px rgba(0, 0, 0, 0.16)',
    statWatermarkColor: 'rgba(74, 222, 128, 0.18)',
    quoteBorder: '1px solid rgba(255, 255, 255, 0.18)',
    reportBarBg: 'linear-gradient(135deg, rgba(62, 142, 110, 0.25) 0%, rgba(21, 69, 52, 0.75) 100%)',
    reportBarBorder: '1px solid rgba(167, 243, 208, 0.35)',
    reportBarShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 4px 16px rgba(0, 0, 0, 0.2)',
    reportIconBg: 'linear-gradient(135deg, #A7F3D0 0%, #059669 100%)',
    reportIconColor: '#FFFFFF',
    reportBtnBg: 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
    reportBtnColor: '#FFFFFF',
    reportBtnShadow: '0 2px 8px rgba(5, 150, 105, 0.35)',
  },
  VIP: {
    background: 'linear-gradient(145deg, #144D44 0%, #0D332D 100%)',
    badgeBg: 'rgba(255,255,255,.24)',
    statBg: 'rgba(255,255,255,.14)',
    quoteBg: 'rgba(232, 120, 74, 0.12)',
    border: '1px solid rgba(232, 120, 74, 0.55)',
    shadow: '0 14px 36px rgba(13, 51, 45, 0.4), inset 0 1px 0 rgba(255, 236, 222, 0.25)',
    shine: true,
    patternType: 'vip',
    glowColor: 'rgba(245, 158, 11, 0.28)',
    avatarHalo: '0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 4.5px rgba(232, 120, 74, 0.85), 0 0 14px rgba(232, 120, 74, 0.45)',
    statNumberGradient: 'linear-gradient(180deg, #FFFFFF 20%, #FFD6BA 75%, #FF9A62 100%)',
    statBorder: '1px solid rgba(232, 120, 74, 0.35)',
    statHighlight: 'inset 0 1px 0 rgba(255, 236, 222, 0.4), 0 4px 14px rgba(0, 0, 0, 0.2)',
    statWatermarkColor: 'rgba(232, 120, 74, 0.24)',
    quoteBorder: '1px solid rgba(232, 120, 74, 0.32)',
    reportBarBg: 'linear-gradient(135deg, rgba(232, 120, 74, 0.24) 0%, rgba(13, 51, 45, 0.8) 100%)',
    reportBarBorder: '1px solid rgba(255, 215, 195, 0.45)',
    reportBarShadow: 'inset 0 1px 0 rgba(255, 236, 222, 0.3), 0 4px 16px rgba(0, 0, 0, 0.22)',
    reportIconBg: 'linear-gradient(135deg, #FFD2B8 0%, #E8784A 100%)',
    reportIconColor: '#FFFFFF',
    reportBtnBg: 'linear-gradient(135deg, #FFB288 0%, #E8784A 100%)',
    reportBtnColor: '#FFFFFF',
    reportBtnShadow: '0 2px 8px rgba(232, 120, 74, 0.4)',
  },
  SVIP: {
    background: 'linear-gradient(145deg, #0F3731 0%, #0A2925 100%)',
    badgeBg: 'rgba(255,255,255,.16)',
    statBg: 'rgba(201, 164, 92, 0.12)',
    quoteBg: 'rgba(201, 164, 92, 0.12)',
    border: '1px solid rgba(201, 164, 92, 0.75)',
    shadow: '0 16px 42px rgba(10, 41, 37, 0.52), inset 0 1px 0 rgba(255, 248, 230, 0.3)',
    shine: true,
    patternType: 'svip',
    glowColor: 'rgba(201, 164, 92, 0.36)',
    avatarHalo: '0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 4.5px rgba(201, 164, 92, 0.95), 0 0 18px rgba(201, 164, 92, 0.55)',
    statNumberGradient: 'linear-gradient(180deg, #FFFFFF 15%, #F8E7C0 68%, #D8B467 100%)',
    statBorder: '1px solid rgba(201, 164, 92, 0.45)',
    statHighlight: 'inset 0 1px 0 rgba(246, 233, 200, 0.5), 0 4px 16px rgba(0, 0, 0, 0.25)',
    statWatermarkColor: 'rgba(201, 164, 92, 0.26)',
    quoteBorder: '1px solid rgba(201, 164, 92, 0.4)',
    reportBarBg: 'linear-gradient(135deg, rgba(201, 164, 92, 0.26) 0%, rgba(10, 41, 37, 0.85) 100%)',
    reportBarBorder: '1px solid rgba(246, 233, 200, 0.55)',
    reportBarShadow: 'inset 0 1px 0 rgba(246, 233, 200, 0.4), 0 4px 18px rgba(0, 0, 0, 0.28)',
    reportIconBg: 'linear-gradient(135deg, #F8E7C0 0%, #D8B467 100%)',
    reportIconColor: '#0A2925',
    reportBtnBg: 'linear-gradient(135deg, #F5E2B3 0%, #D8B467 50%, #B89246 100%)',
    reportBtnColor: '#0A2925',
    reportBtnShadow: '0 2px 10px rgba(201, 164, 92, 0.5)',
  },
}

/** 替换欢迎语中的 {name} 占位符 */
export function fillName(template: string, name: string): string {
  return template.replace(/\{name\}/g, name || '')
}
