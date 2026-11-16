export const Colors = {
  background: '#FAF9F6',
  surface: '#FFFFFF',
  primary: '#6D4AFF',
  primaryDark: '#5636D9',
  primaryLight: '#F3EFFF',
  text: '#20202A',
  textSecondary: '#656575',
  textMuted: '#9898A6',
  border: '#ECEAE4',
  borderStrong: '#D6D4CC',
  error: '#B42318',
  errorLight: '#FEE4E2',
  success: '#16794B',
  successLight: '#DCFCE7',
  warning: '#B54708',
  warningLight: '#FEF0C7',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const Typography = {
  titleLarge: { fontSize: 26, fontWeight: '700' as const, color: Colors.text, lineHeight: 32 },
  titleMedium: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, lineHeight: 26 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, color: Colors.text, lineHeight: 22 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, color: Colors.text, lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '500' as const, color: Colors.textSecondary, lineHeight: 18 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
} as const;

export const Layout = {
  minTouchTarget: 48,
} as const;

