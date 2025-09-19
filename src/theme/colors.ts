// Letta Brand Colors
export const LettaColors = {
  // Primary Brand Colors
  deepBlack: '#0A0A0A',
  pureWhite: '#FFFFFF',
  neutralGray: '#B8B8B8',

  // Accent Colors
  electricBlue: '#0066FF',
  vibrantOrange: '#FF5500',
  royalBlue: {
    start: '#0040CC',
    end: '#4080FF',
  },

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
  success: '#00CC66',
  warning: '#FFAA00',
  error: '#FF3366',
  info: '#0066FF',

  // Technical Colors (for code, reasoning, etc)
  mono: {
    bg: '#0F0F0F',
    text: '#B8B8B8',
    accent: '#0066FF',
  }
} as const;

// Theme-aware color tokens
export const createColorTokens = (isDark: boolean = true) => ({
  // Backgrounds
  background: {
    // Subtle elevation around #202020 in dark mode
    // primary: canvas, secondary: sidebars/rails, tertiary: headers/cards, surface: chat bubbles/inputs
    primary: isDark ? '#202020' : LettaColors.pureWhite,
    secondary: isDark ? '#1C1C1C' : LettaColors.lightGray[100],
    tertiary: isDark ? '#242424' : LettaColors.lightGray[200],
    surface: isDark ? '#262626' : LettaColors.pureWhite,
  },

  // Text Colors
  text: {
    primary: isDark ? LettaColors.pureWhite : LettaColors.deepBlack,
    secondary: isDark ? LettaColors.neutralGray : '#666666',
    tertiary: isDark ? '#888888' : '#999999',
    inverse: isDark ? LettaColors.deepBlack : LettaColors.pureWhite,
  },

  // Interactive Elements
  interactive: {
    primary: LettaColors.electricBlue,
    primaryHover: '#0052CC',
    secondary: LettaColors.vibrantOrange,
    secondaryHover: '#E64A00',
    disabled: '#666666',
  },

  // Borders & Separators
  border: {
    primary: isDark ? '#333333' : '#E5E5E5',
    secondary: isDark ? '#1A1A1A' : '#F0F0F0',
    accent: LettaColors.electricBlue,
  },

  // Status & Feedback
  status: {
    success: LettaColors.success,
    warning: LettaColors.warning,
    error: LettaColors.error,
    info: LettaColors.info,
  },

  // Gradients
  gradients: {
    royal: `linear-gradient(135deg, ${LettaColors.royalBlue.start} 0%, ${LettaColors.royalBlue.end} 100%)`,
    accent: `linear-gradient(135deg, ${LettaColors.electricBlue} 0%, ${LettaColors.vibrantOrange} 100%)`,
  },

  // Shadows & Effects
  shadow: {
    small: isDark ? '0 1px 3px rgba(0, 0, 0, 0.5)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
    medium: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
    large: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
    glow: `0 0 20px ${LettaColors.electricBlue}40`,
  }
});

// Export default dark theme
export const defaultColors = createColorTokens(true);
export const lightColors = createColorTokens(false);

export type ColorTokens = ReturnType<typeof createColorTokens>;
