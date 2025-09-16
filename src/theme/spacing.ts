// Letta Brand Spacing System - Based on 8px Grid

export const spacing = {
  // Base unit (8px)
  1: 8,
  2: 16,
  3: 24,
  4: 32,
  5: 40,
  6: 48,
  7: 56,
  8: 64,
  9: 72,
  10: 80,
  12: 96,
  16: 128,
  20: 160,
  24: 192,
  32: 256,

  // Fractional spacing
  0.5: 4,
  1.5: 12,
  2.5: 20,
  3.5: 28,

  // Component-specific
  componentGap: 24, // Gap between major UI components
  sectionGap: 40,   // Gap between major sections
  messageGap: 24,   // Gap between message groups
  inputPadding: 16, // Padding inside inputs
  buttonPadding: 12, // Padding inside buttons
} as const;

// Responsive breakpoints (following brand guidelines)
export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

// Layout dimensions
export const layout = {
  // Sidebar
  sidebarWidth: 280,
  sidebarCollapsedWidth: 64,

  // Content
  maxContentWidth: 840, // Optimal reading width based on golden ratio
  maxInputWidth: 800,

  // Component sizes
  headerHeight: 56,
  inputHeight: 48,
  buttonHeight: 48,
  buttonSmallHeight: 32,

  // Border radius (geometric/minimal approach)
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    round: 24,
  }
} as const;

// Grid system
export const grid = {
  columns: {
    mobile: 6,
    tablet: 8,
    desktop: 12,
  },
  gutterWidth: spacing[2], // 16px
  marginWidth: spacing[3], // 24px on mobile, responsive
} as const;

export type Spacing = typeof spacing;
export type Layout = typeof layout;