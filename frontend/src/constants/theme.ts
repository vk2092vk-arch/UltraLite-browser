// UltraLite theme — based on user-provided UI screenshot
export const COLORS = {
  // Maroon palette (matches user reference)
  maroon: '#5C0A1A',
  maroonDark: '#3F0712',
  maroonLight: '#7A0F22',
  maroonAccent: '#A11534',

  // Surfaces
  bg: '#F5F3F4',
  card: '#FFFFFF',
  cardSoft: '#EFECEE',
  border: '#E2DDDF',

  // Text
  text: '#1A1014',
  textMuted: '#6B5560',
  textOnDark: '#FFFFFF',
  textSubtle: '#8A7884',

  // Status
  success: '#2E7D32',
  warning: '#E08600',
  danger: '#C62828',

  // Toggle
  toggleBg: '#3F0712',
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
