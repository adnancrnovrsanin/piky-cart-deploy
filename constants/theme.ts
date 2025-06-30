// PikyCart Brand Theme
export const COLORS = {
  // Primary Palette
  primary: '#20C997', // Vibrant Teal - Primary CTA, key highlights
  secondary: '#4263EB', // Confident Blue - Secondary actions, info, links
  secondaryLight: '#EBF4FF', // Light Blue - Secondary light background
  
  // Secondary Palette
  text: '#495057', // Text & UI Gray - Primary text and headlines
  border: '#ADB5BD', // Border & Icon Gray - Borders, outlines, dividers, inactive icons
  background: '#FFFFFF', // Clean White - Primary content background
  backgroundAlt: '#F8F9FA', // Light Background - Secondary background areas
  
  // Accent Color
  accent: '#FFA94D', // Accent Yellow-Orange - High-emphasis elements, savings highlights
  
  // Status Colors
  success: '#20C997', // Success messages and indicators
  error: '#FA5252', // Error messages and indicators
  warning: '#FFA94D', // Warning messages and indicators
  info: '#4263EB', // Information messages and indicators
  
  // Grayscale
  white: '#FFFFFF',
  gray100: '#F8F9FA',
  gray200: '#E9ECEF',
  gray300: '#DEE2E6',
  gray400: '#CED4DA',
  gray500: '#ADB5BD',
  gray600: '#6C757D',
  gray700: '#495057',
  gray800: '#343A40',
  gray900: '#212529',
  black: '#000000',
  
  // Transparency
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  
  // Gradients (for use with LinearGradient)
  gradientPrimary: ['#20C997', '#12B886'],
  gradientSecondary: ['#4263EB', '#364FC7'],
  gradientAccent: ['#FFA94D', '#FF922B'],
};

export const FONTS = {
  // Heading Font: Montserrat
  heading: {
    regular: 'Montserrat-Regular',
    medium: 'Montserrat-Medium',
    semiBold: 'Montserrat-SemiBold',
    bold: 'Montserrat-Bold',
  },
  
  // Body Font: Open Sans
  body: {
    regular: 'OpenSans-Regular',
    medium: 'OpenSans-Medium',
    semiBold: 'OpenSans-SemiBold',
    bold: 'OpenSans-Bold',
  },
};

export const FONT_SIZES = {
  // Typography Scale
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  body1: 16,
  body2: 14,
  caption: 12,
  small: 10,
};

export const SPACING = {
  // Spacing Scale
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

// Animation durations
export const ANIMATION = {
  fast: 200,
  medium: 300,
  slow: 500,
};

// Z-index values for consistent layering
export const Z_INDEX = {
  base: 1,
  card: 10,
  modal: 100,
  toast: 1000,
};

// Common text styles
export const TEXT_STYLES = {
  h1: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.h1,
    color: COLORS.text,
    lineHeight: FONT_SIZES.h1 * 1.3,
  },
  h2: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.h2,
    color: COLORS.text,
    lineHeight: FONT_SIZES.h2 * 1.3,
  },
  h3: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.text,
    lineHeight: FONT_SIZES.h3 * 1.3,
  },
  h4: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.h4,
    color: COLORS.text,
    lineHeight: FONT_SIZES.h4 * 1.3,
  },
  h5: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.h5,
    color: COLORS.text,
    lineHeight: FONT_SIZES.h5 * 1.3,
  },
  body1: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.body1,
    color: COLORS.text,
    lineHeight: FONT_SIZES.body1 * 1.5,
  },
  body2: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.body2,
    color: COLORS.text,
    lineHeight: FONT_SIZES.body2 * 1.5,
  },
  caption: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.gray600,
    lineHeight: FONT_SIZES.caption * 1.5,
  },
  button: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.body1,
    color: COLORS.white,
  },
  link: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.body2,
    color: COLORS.secondary,
  },
};

// Common button styles
export const BUTTON_STYLES = {
  primary: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.small,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.small,
  },
  outline: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  text: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
};

// Common input styles
export const INPUT_STYLES = {
  default: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.body1,
    color: COLORS.text,
  },
  focus: {
    borderColor: COLORS.primary,
  },
  error: {
    borderColor: COLORS.error,
  },
};

// Common card styles
export const CARD_STYLES = {
  default: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  elevated: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.medium,
  },
};

// Chart color palette derived from theme
export const CHART_COLORS = {
  primary: COLORS.secondary,      // #4263EB (Blue)
  success: COLORS.success,        // #20C997 (Teal)
  accent: COLORS.accent,          // #FFA94D (Orange)
  error: COLORS.error,            // #FA5252 (Red)
  purple: '#8B5CF6',              // Purple
  cyan: '#06B6D4',                // Cyan
  lime: '#84CC16',                // Lime
  orange: '#F97316',              // Orange alt
  pink: '#EC4899',                // Pink
  gray: COLORS.gray600,           // Gray
};

// Chart data colors array for pie charts and other multi-color charts
export const CHART_COLOR_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.accent,
  CHART_COLORS.error,
  CHART_COLORS.purple,
  CHART_COLORS.cyan,
  CHART_COLORS.lime,
  CHART_COLORS.orange,
  CHART_COLORS.pink,
  CHART_COLORS.gray,
];