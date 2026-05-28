// 牧哲学堂 Unified Design Tokens
// Warm, bright, education-focused theme

export const COLORS = {
  // Brand
  primary: '#E8784A',
  primaryHover: '#DD6B3D',
  primaryLight: '#FFF2EA',
  primaryAccent: '#F29A62',

  // Backgrounds
  pageBg: '#faf8f5',
  cardBg: '#ffffff',
  cardBgSecondary: '#FCFBF9',
  cardBgTertiary: '#F8F6F2',

  // Text
  textPrimary: '#1F2329',
  textSecondary: '#374151',
  textBody: '#5B6472',
  textMuted: '#98A2B3',

  // Borders
  border: '#EEE7E1',
  borderLight: '#F3EDE6',
  borderFocus: '#E87545',

  // Semantic
  success: '#16A34A',
  successBg: '#F0FDF4',
  warning: '#F59E0B',
  warningBg: '#FFFDE7',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  info: '#3B82F6',

  // Shadows
  shadow: '0 8px 24px rgba(25,30,40,0.06)',
  shadowMd: '0 12px 32px rgba(25,30,40,0.08)',
  shadowSm: '0 4px 12px rgba(25,30,40,0.04)',
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
