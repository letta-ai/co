// Letta Brand Typography System

export const fontFamily = {
  primary: '-apple-system, "SF Pro Display", Inter, "Helvetica Neue", sans-serif',
  mono: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
} as const;

export const fontSize = {
  // Headlines (H1-H6)
  h1: 64,
  h2: 40,
  h3: 32,
  h4: 24,
  h5: 20,
  h6: 18,

  // Body Text
  body: 16,
  bodySmall: 14,

  // UI Elements
  button: 14,
  input: 16,
  label: 12,
  caption: 11,

  // Technical
  code: 14,
  tiny: 10,
} as const;

export const fontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
  loose: 1.8,
} as const;

export const letterSpacing = {
  tight: -0.02,
  normal: 0,
  wide: 0.08,
} as const;

// Typography Tokens
export const typography = {
  // Headlines
  h1: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
    fontFamily: fontFamily.primary,
  },
  h2: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
    fontFamily: fontFamily.primary,
  },
  h3: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
  },
  h4: {
    fontSize: fontSize.h4,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
  },
  h5: {
    fontSize: fontSize.h5,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
  },
  h6: {
    fontSize: fontSize.h6,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
  },

  // Body Text
  body: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
  },
  bodySmall: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
  },

  // UI Components
  button: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
    textTransform: 'none' as const,
  },
  buttonSmall: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.wide,
    fontFamily: fontFamily.primary,
    textTransform: 'uppercase' as const,
  },
  input: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
  },
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.light,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.wide,
    fontFamily: fontFamily.primary,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
  },

  // Technical Elements
  code: {
    fontSize: fontSize.code,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.mono,
  },
  technical: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.light,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.wide,
    fontFamily: fontFamily.primary,
    textTransform: 'uppercase' as const,
  },

  // Chat-specific
  chatMessage: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
  },
  reasoning: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.light,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
    fontStyle: 'italic' as const,
  },
  agentName: {
    fontSize: fontSize.h6,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamily.primary,
  },
  timestamp: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.light,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.wide,
    fontFamily: fontFamily.primary,
    textTransform: 'uppercase' as const,
  }
} as const;

export type Typography = typeof typography;