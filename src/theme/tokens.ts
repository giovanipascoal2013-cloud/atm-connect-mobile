export const colors = {
  brand: {
    50: '#F0F6FE',
    100: '#DCEDFC',
    200: '#B8D9F8',
    300: '#8ABFF3',
    400: '#4E9DEB',
    500: '#1573D6',
    600: '#1163C0',
    700: '#1151A0',
    800: '#0F4482',
    900: '#0D376A',
  },
  accent: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  money: '#10B981',
  surface: '#F7F8FA',
  card: '#FFFFFF',
  border: '#ECEEF2',
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#6B7280',
  },
  danger: '#EF4444',
  warning: '#F59E0B',
} as const

export const brandGradient = ['#1573D6', '#10B981'] as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const

export const shadows = {
  none: {},
  card: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  raised: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  floating: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const

export const typography = {
  title: { fontSize: 20, fontWeight: '700' as const, color: colors.text.primary, letterSpacing: -0.3 },
  heading: { fontSize: 16, fontWeight: '600' as const, color: colors.text.primary },
  body: { fontSize: 14, color: '#374151', lineHeight: 20 },
  caption: { fontSize: 12, color: colors.text.secondary },
  label: { fontSize: 12, fontWeight: '600' as const, color: colors.text.secondary },
  money: { fontVariant: ['tabular-nums' as const] },
} as const
