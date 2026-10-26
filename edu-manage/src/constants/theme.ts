// 牧哲学堂 Unified Design Tokens
// Warm-light surfaces with a forest-green and brass brand system.

export const COLORS = {
  // Brand — synced with DESIGN.md v2
  primary: '#14574D',
  primaryHover: '#10483F',
  primaryFocus: '#0B3D35',
  primaryLight: '#EAF4F1',
  brandGreen: '#14574D',
  brandGreenDeep: '#0D3732',
  brandGold: '#8A6517',
  brandGoldFill: '#D6B45B',
  brandGoldLight: '#F8F1DE',
  brandOrange: '#E8784A',

  // Backgrounds — synced with DESIGN.md surface ladder
  pageBg: '#faf8f5',       // canvas
  cardBg: '#ffffff',        // surface-1
  cardBgSecondary: '#faf8f5', // surface-2
  cardBgTertiary: '#f5f2ee',  // surface-3

  // Text — synced with DESIGN.md ink scale
  textPrimary: '#1a1201',   // ink
  textSecondary: '#5a4e3a', // ink-muted
  textBody: '#5a4e3a',      // ink-muted (alias)
  textMuted: '#756A58',     // ink-subtle, readable on white and canvas

  // Borders — synced with DESIGN.md
  border: 'rgba(0,0,0,.06)',
  borderLight: 'rgba(0,0,0,.04)',
  borderStrong: 'rgba(0,0,0,.12)',
  borderFocus: '#14574D',

  // Semantic — synced with DESIGN.md
  success: '#137A5A',
  successAction: '#137A5A',
  successBg: '#eaf7f1',
  warning: '#A56B00',
  warningText: '#805A0D',
  warningBg: '#F8F1DE',
  error: '#B42318',
  errorBg: '#FEF0EE',
  info: '#14574D',

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
    colorPrimary: COLORS.primary,
    colorInfo: COLORS.info,
    colorSuccess: COLORS.successAction,
    colorWarning: COLORS.warning,
    colorError: COLORS.error,
    colorBgBase: COLORS.pageBg,
    colorBgContainer: COLORS.cardBg,
    colorBgElevated: COLORS.cardBg,
    colorBgLayout: COLORS.pageBg,
    colorBorder: COLORS.border,
    colorBorderSecondary: COLORS.borderLight,
    colorText: COLORS.textPrimary,
    colorTextSecondary: COLORS.textSecondary,
    colorTextTertiary: COLORS.textMuted,
    colorTextQuaternary: COLORS.textMuted,
    colorBgSpotlight: COLORS.brandGreenDeep,
    boxShadowSecondary: '0 16px 48px rgba(26,18,1,.14)',
    motionDurationFast: '0.15s',
    motionDurationMid: '0.18s',
    motionDurationSlow: '0.24s',
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
      primaryShadow: '0 4px 14px rgba(20,87,77,.22)',
      primaryColor: '#ffffff',
      defaultBg: '#ffffff',
      defaultBorderColor: COLORS.borderStrong,
      defaultColor: COLORS.textPrimary,
    },
    Card: {
      borderRadiusLG: 14,
      paddingLG: 24,
      colorBgContainer: '#ffffff',
      colorBorderSecondary: COLORS.border,
    },
    Table: {
      borderRadiusLG: 14,
      colorBgContainer: '#ffffff',
      headerBg: COLORS.cardBgSecondary,
      headerColor: COLORS.textSecondary,
      rowHoverBg: 'rgba(20,87,77,.045)',
      borderColor: COLORS.border,
    },
    Input: {
      borderRadius: 10,
      paddingInline: 12,
      controlHeight: 38,
      colorBgContainer: '#fafafa',
      colorBorder: COLORS.borderStrong,
      hoverBorderColor: 'rgba(20,87,77,.5)',
      activeBorderColor: COLORS.primary,
    },
    Select: {
      borderRadius: 10,
      controlHeight: 38,
      colorBgContainer: '#ffffff',
      colorBorder: COLORS.borderStrong,
      optionSelectedBg: 'rgba(20,87,77,.08)',
    },
    Layout: {
      siderBg: '#faf8f5',
      headerBg: '#ffffff',
      bodyBg: '#faf8f5',
    },
    Menu: {
      itemSelectedBg: 'rgba(20,87,77,.1)',
      itemSelectedColor: COLORS.primary,
      itemHoverBg: 'rgba(20,87,77,.04)',
    },
    Tag: {
      borderRadiusSM: 9999,
    },
    Modal: {
      contentBg: COLORS.cardBg,
      headerBg: COLORS.cardBg,
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
