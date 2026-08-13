/**
 * Central design tokens for Otaku Shelf.
 *
 * Palette leans into a warm "display case" feel: deep ink background for
 * shelf chrome, a paper-cream accent for the Paper category, and a soft
 * lavender-teal accent for the Figure category, avoiding generic
 * purple-on-white AI-default look by keeping the base neutral warm-charcoal.
 */

export const colors = {
  bg: '#15131A',
  bgElevated: '#1F1C26',
  bgCard: '#262230',
  border: '#37324045',
  borderStrong: '#3D3749',
  textPrimary: '#F5F1EB',
  textSecondary: '#B7AFC2',
  textMuted: '#7C7488',

  paper: '#F2A65A',
  paperSoft: '#3A2C22',
  figure: '#5AC8D8',
  figureSoft: '#1E3134',

  success: '#63C787',
  danger: '#E0637A',
  warning: '#E0A63E',

  slotEmpty: '#2A2632',
  slotBorder: '#443C54',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const fonts = {
  display: 'System',
  body: 'System',
};

export const typography = {
  hero: { fontSize: 30, fontWeight: '800' as const, letterSpacing: 0.2 },
  title: { fontSize: 22, fontWeight: '700' as const },
  subtitle: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};

export function categoryColor(category: 'paper' | 'figure'): string {
  return category === 'paper' ? colors.paper : colors.figure;
}

export function categorySoftColor(category: 'paper' | 'figure'): string {
  return category === 'paper' ? colors.paperSoft : colors.figureSoft;
}
