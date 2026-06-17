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

// Shared Ant Design ConfigProvider theme — used by admin and parent providers
export const ANTD_THEME = {
  token: {
    colorPrimary: '#E8784A',
    colorInfo: '#E8784A',
    colorSuccess: '#1D9E75',
    colorWarning: '#f5a623',
    colorError: '#E24B4A',
    colorBgBase: '#faf8f5',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#faf8f5',
    colorBorder: 'rgba(0,0,0,.06)',
    colorBorderSecondary: 'rgba(0,0,0,.04)',
    colorText: '#1a1201',
    colorTextSecondary: '#5a4e3a',
    colorTextTertiary: '#9a8e7a',
    colorTextQuaternary: 'rgba(0,0,0,.35)',
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 8,
    borderRadiusXS: 6,
    fontSize: 14,
    fontFamily: 'var(--font-geist-sans)',
    fontFamilyCode: 'var(--font-geist-mono)',
    lineHeight: 1.5,
    wireframe: false,
  },
  components: {
    Button: {
      borderRadius: 10,
      controlHeight: 38,
      paddingInline: 16,
      primaryShadow: '0 4px 14px rgba(232,120,74,.3)',
      primaryColor: '#ffffff',
      defaultBg: '#ffffff',
      defaultBorderColor: 'rgba(0,0,0,.12)',
      defaultColor: '#1a1201',
    },
    Card: {
      borderRadiusLG: 14,
      paddingLG: 24,
      colorBgContainer: '#ffffff',
      colorBorderSecondary: 'rgba(0,0,0,.06)',
    },
    Table: {
      borderRadiusLG: 14,
      colorBgContainer: '#ffffff',
      headerBg: '#faf8f5',
      headerColor: '#5a4e3a',
      rowHoverBg: 'rgba(232,120,74,.04)',
      borderColor: 'rgba(0,0,0,.06)',
    },
    Input: {
      borderRadius: 10,
      paddingInline: 12,
      controlHeight: 38,
      colorBgContainer: '#fafafa',
      colorBorder: '#EFE3DC',
      hoverBorderColor: 'rgba(232,120,74,.5)',
      activeBorderColor: '#E8784A',
    },
    Select: {
      borderRadius: 10,
      controlHeight: 38,
      colorBgContainer: '#ffffff',
      colorBorder: 'rgba(0,0,0,.12)',
      optionSelectedBg: 'rgba(232,120,74,.08)',
    },
    Layout: {
      siderBg: '#faf8f5',
      headerBg: '#ffffff',
      bodyBg: '#faf8f5',
    },
    Menu: {
      itemSelectedBg: 'rgba(232,120,74,.1)',
      itemSelectedColor: '#E8784A',
      itemHoverBg: 'rgba(232,120,74,.04)',
    },
    Tag: {
      borderRadiusSM: 9999,
    },
    Modal: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
    },
  },
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
