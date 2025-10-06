// Co Brand Colors (from logo SVG)
export const CoColors = {
  // Primary Brand Colors
  cream: '#F5F5F0',        // Light cream for better readability
  warmOrange: '#EFA04E',   // First C accent
  deepOrange: '#E07042',   // Second O accent
  sageGreen: '#8E9A7C',    // Background C and O

  // Supporting Colors
  deepBlack: '#0A0A0A',
  pureWhite: '#FFFFFF',
  neutralGray: '#B8B8B8',

  // Extended Palette
  darkGray: {
    100: '#1A1A1A',
    200: '#0F0F0F',
    300: '#050505',
  },
  lightGray: {
    100: '#F8F8F8',
    200: '#E5E5E5',
    300: '#CCCCCC',
  },

  // Semantic Colors
  success: '#8E9A7C',      // Sage green for success
  warning: '#EFA04E',      // Warm orange for warnings
  error: '#E07042',        // Deep orange for errors
  info: '#8E9A7C',         // Sage green for info

  // Technical Colors (for code, reasoning, etc)
  mono: {
    bg: '#0F0F0F',
    text: '#B8B8B8',
    accent: '#EFA04E',     // Warm orange accent
  }
} as const;

// Theme-aware color tokens
export const createColorTokens = (isDark: boolean = true) => ({
  // Backgrounds
  background: {
    // Establish subtle steps for contrast between surfaces
    primary: isDark ? '#242424' : CoColors.pureWhite,
    secondary: isDark ? '#242424' : '#FAFAFA',
    // Slightly lighter panels
    tertiary: isDark ? '#2A2A2A' : '#F5F5F5',
    // Most elevated surfaces (cards, selection states)
    surface: isDark ? '#303030' : '#F0F0F0',
    // A touch brighter than surface for selected items
    selected: isDark ? '#383838' : '#EDEDED',
  },

  // Text Colors
  text: {
    primary: isDark ? '#E5E5E5' : CoColors.deepBlack,     // Bright white-ish text in dark mode for better contrast
    secondary: isDark ? CoColors.neutralGray : '#666666',
    tertiary: isDark ? '#888888' : '#999999',
    // Inverse of the canvas: light text on dark, dark text on light
    inverse: isDark ? '#E5E5E5' : CoColors.deepBlack,
  },

  // Interactive Elements
  interactive: {
    primary: CoColors.warmOrange,       // Warm orange primary
    primaryHover: '#D89040',            // Slightly darker warm orange
    secondary: CoColors.sageGreen,      // Sage green secondary
    secondaryHover: '#7A8A6A',          // Slightly darker sage
    disabled: '#666666',
  },

  // Borders & Separators
  border: {
    primary: isDark ? '#333333' : '#E5E5E5',
    secondary: isDark ? '#1A1A1A' : '#F0F0F0',
    accent: CoColors.warmOrange,        // Warm orange accent
  },

  // Status & Feedback
  status: {
    success: CoColors.success,
    warning: CoColors.warning,
    error: CoColors.error,
    info: CoColors.info,
  },

  // Gradients
  gradients: {
    warm: `linear-gradient(135deg, ${CoColors.warmOrange} 0%, ${CoColors.deepOrange} 100%)`,
    accent: `linear-gradient(135deg, ${CoColors.warmOrange} 0%, ${CoColors.sageGreen} 100%)`,
  },

  // Shadows & Effects
  shadow: {
    small: isDark ? '0 1px 3px rgba(0, 0, 0, 0.5)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
    medium: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
    large: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
    glow: `0 0 20px ${CoColors.warmOrange}40`,
  }
});

// Export default dark theme
export const defaultColors = createColorTokens(true);
export const lightColors = createColorTokens(false);

export type ColorTokens = ReturnType<typeof createColorTokens>;
