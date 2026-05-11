// UltraLite theme — based on app logo (orange + blue on cream/white)
// Build #22: maroon palette retired → white background everywhere,
// orange/blue accents from the official UltraLite logo.
export const COLORS = {
  // Brand palette (logo)
  brandOrange: '#E07B47',
  brandOrangeDark: '#B85F2E',
  brandBlue: '#3B7B9C',
  brandBlueDark: '#2A5A75',

  // Legacy alias kept so existing code keeps compiling — every reference
  // now resolves to the new orange brand colour.  Remove once the home
  // & radio screens have been migrated to brandOrange / brandBlue.
  maroon: '#E07B47',
  maroonDark: '#B85F2E',
  maroonLight: '#F0A47A',
  maroonAccent: '#3B7B9C',

  // Surfaces (everything white now)
  bg: '#FFFFFF',
  card: '#FFFFFF',
  cardSoft: '#F4F4F6',
  border: '#E6E6EA',

  // Text
  text: '#1A1A1A',
  textMuted: '#6B6B70',
  textOnDark: '#FFFFFF',
  textSubtle: '#8A8A90',

  // Status
  success: '#1F8A4E',
  warning: '#E08600',
  danger: '#C62828',

  // Toggle (legacy alias)
  toggleBg: '#3B7B9C',
  toggleActive: '#FFFFFF',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
};

export const FONT = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    title: 32,
  },
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
};
