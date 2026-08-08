export const colors = {
  brand: {
    50: '#F0F6FF',
    100: '#DCECFE',
    200: '#BBD8FC',
    300: '#8EBBF9',
    400: '#5B9BFB',
    500: '#2F7BF0',
    600: '#1C5FD1',
    700: '#184FA9',
    800: '#164289',
    900: '#14366E',
  },
  accent: {
    50: '#EAF6EE',
    100: '#D5EDDC',
    200: '#ABDCBC',
    300: '#80CA9B',
    400: '#66C687',
    500: '#4CAF6B',
    600: '#399256',
    700: '#2F7A48',
    800: '#28613C',
    900: '#225032',
  },
  money: '#4CAF6B',
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

export const brandGradient = ['#2F7BF0', '#4CAF6B'] as const

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
