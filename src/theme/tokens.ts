// Design tokens for mobile app
// Adapted from web CUSTOMER_PORTAL_THEME to React Native compatible values

export const colors = {
  // Brand colors
  primary: '#F7B82D',
  primaryDark: '#E5A81E',
  primaryLight: '#FEF9EC',
  primaryBorder: '#F7D980',

  // Neutral
  black: '#141414',
  white: '#FFFFFF',
  background: '#F8F6F1',
  surface: '#FFFFFF',
  border: '#D4C4AD',
  borderLight: 'rgba(212, 196, 173, 0.3)',

  // Text — chỉnh để đạt WCAG AA (>=4.5:1 trên nền trắng) cho body/secondary text.
  textPrimary: '#141414',
  textSecondary: '#475569', // slate-600 (~7:1)
  textMuted: '#64748B', // slate-500 (~4.6:1) — trước là slate-400 (#94A3B8, 2.56:1, fail AA)
  textDisabled: '#CBD5E1', // slate-300 (chỉ dùng cho trạng thái disabled)
  // Màu chữ/link nhấn trên nền trắng. KHÔNG dùng brand primary (vàng, 1.77:1) làm text.
  actionText: '#B45309', // amber-700 (~5:1)

  // Status
  success: '#10B981', // emerald-500
  successLight: '#D1FAE5', // emerald-100
  successText: '#047857', // emerald-700 (~5:1) — đủ AA cho text trên nền trắng/successLight
  error: '#F43F5E', // rose-500
  errorLight: '#FFE4E6', // rose-100
  warning: '#F59E0B', // amber-500
  warningLight: '#FEF3C7', // amber-100
  info: '#3B82F6', // blue-500
  infoLight: '#DBEAFE', // blue-100

  // Semantic
  deposit: '#10B981',
  payment: '#F43F5E',
  refund: '#10B981',
} as const;

export const typography = {
  fontFamily: {
    regular: 'Geist_400Regular',
    medium: 'Geist_500Medium',
    semibold: 'Geist_600SemiBold',
    bold: 'Geist_700Bold',
    extrabold: 'Geist_800ExtraBold',
    black: 'Geist_900Black',
  },
  fontSize: {
    // 10px quá nhỏ cho mobile (review P0.4) — nâng sàn lên 11px.
    xs: 11,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
} as const;

export const fontFamilyForWeight = (
  weight?: string | number | null,
): string => {
  const normalized = String(weight ?? '400');

  if (normalized === '900' || normalized === 'black') return typography.fontFamily.black;
  if (normalized === '800' || normalized === 'extrabold') return typography.fontFamily.extrabold;
  if (normalized === '700' || normalized === 'bold') return typography.fontFamily.bold;
  if (normalized === '600' || normalized === 'semibold') return typography.fontFamily.semibold;
  if (normalized === '500' || normalized === 'medium') return typography.fontFamily.medium;

  return typography.fontFamily.regular;
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;
