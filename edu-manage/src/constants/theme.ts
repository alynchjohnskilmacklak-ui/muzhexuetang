// 牧哲学堂 Unified Design Tokens
// Warm, bright, education-focused theme

export const COLORS = {
  // Brand — synced with DESIGN.md v2
  primary: '#E8784A',
  primaryHover: '#f08a5f',
  primaryFocus: '#d0683a',
  primaryLight: '#fff3ec',

  // Backgrounds — synced with DESIGN.md surface ladder
  pageBg: '#faf8f5',       // canvas
  cardBg: '#ffffff',        // surface-1
  cardBgSecondary: '#faf8f5', // surface-2
  cardBgTertiary: '#f5f2ee',  // surface-3

  // Text — synced with DESIGN.md ink scale
  textPrimary: '#1a1201',   // ink
  textSecondary: '#5a4e3a', // ink-muted
  textBody: '#5a4e3a',      // ink-muted (alias)
  textMuted: '#9a8e7a',     // ink-subtle

  // Borders — synced with DESIGN.md
  border: 'rgba(0,0,0,.06)',
  borderLight: 'rgba(0,0,0,.04)',
  borderFocus: '#E8784A',

  // Semantic — synced with DESIGN.md
  success: '#1D9E75',
  successBg: '#eaf7f1',
  warning: '#f5a623',
  warningText: '#C77F00',
  warningBg: '#fdf4e3',
  error: '#E24B4A',
  errorBg: '#fdeceb',
  info: '#E8784A',

  // Shadows
  shadow: '0 8px 24px rgba(26,18,1,.04)',
  shadowMd: '0 12px 32px rgba(26,18,1,.06)',
  shadowSm: '0 4px 12px rgba(26,18,1,.03)',
} as const

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

export const CARD_STYLE = {
  background: COLORS.cardBg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 14,
  padding: 24,
} as const

export const INPUT_STYLE = {
  background: '#FAFAFA',
  borderColor: '#E7DDD5',
  borderRadius: 12,
  height: 42,
  color: COLORS.textPrimary,
} as const
