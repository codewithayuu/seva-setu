import { colors, radius, shadows } from './designTokens';
export const buttonVariants = {
  primary: `rounded-full bg-gradient-to-r ${colors.primaryGradient} hover:opacity-90 shadow-md hover:shadow-lg transition-all duration-200`,
  secondary: `rounded-full bg-gradient-to-r ${colors.secondaryGradient} hover:opacity-90 shadow-md hover:shadow-lg transition-all duration-200`,
  outline: `rounded-full border-2 border-white/20 hover:bg-white/5 transition-all duration-200`,
  ghost: `rounded-full hover:bg-white/10 transition-all duration-200`,
  destructive: `rounded-full bg-gradient-to-r ${colors.dangerGradient} hover:opacity-90 shadow-md transition-all duration-200`,
};
export const cardVariants = {
  default: `glass-card ${radius.card} border-white/20 ${shadows.card} transition-all duration-300`,
  strong: `glass-card-strong ${radius.card} border-white/30 ${shadows.card} transition-all duration-300`,
  flat: `bg-background ${radius.card} border border-white/10 hover:border-white/20 transition-all duration-300`,
  gradient: `${radius.card} bg-gradient-to-br ${colors.primaryGradient} ${shadows.card} transition-all duration-300`,
};
export const inputVariants = {
  default: `glass-input ${radius.input} border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all`,
  solid: `${radius.input} border-2 border-white/20 bg-background focus:border-purple-500 transition-all`,
};
export const badgeVariants = {
  default: `${radius.full} px-3 py-1 text-xs font-medium bg-white/10 border border-white/20`,
  primary: `${radius.full} px-3 py-1 text-xs font-medium bg-gradient-to-r ${colors.primaryGradient}`,
  success: `${radius.full} px-3 py-1 text-xs font-medium bg-gradient-to-r ${colors.successGradient}`,
  warning: `${radius.full} px-3 py-1 text-xs font-medium bg-gradient-to-r ${colors.warningGradient}`,
  danger: `${radius.full} px-3 py-1 text-xs font-medium bg-gradient-to-r ${colors.dangerGradient}`,
};
export const avatarSizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
  '2xl': 'h-24 w-24',
};
export const containerWidths = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};
export const gridLayouts = {
  feed: 'grid grid-cols-1 lg:grid-cols-12 gap-6',
  cards: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
  list: 'grid grid-cols-1 gap-4',
  masonry: 'columns-1 sm:columns-2 lg:columns-3 gap-6',
};
export const layoutPresets = {
  page: 'min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8',
  pageMobile: 'min-h-screen pt-16 pb-24 px-4',
  section: 'py-12 sm:py-16 lg:py-20',
  container: 'max-w-7xl mx-auto',
};