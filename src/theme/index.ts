// Letta Theme System - Central Export

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './animations';

import { defaultColors, lightColors, createColorTokens, type ColorTokens } from './colors';
import { typography, type Typography } from './typography';
import { spacing, layout, breakpoints, type Spacing, type Layout } from './spacing';
import { duration, easing, animations, createTransition, type Duration, type Easing } from './animations';

// Complete theme object
export const createTheme = (isDark: boolean = true) => ({
  colors: createColorTokens(isDark),
  typography,
  spacing,
  layout,
  breakpoints,
  animations: {
    duration,
    easing,
    presets: animations,
    createTransition,
  },
});

// Default themes
export const darkTheme = createTheme(true);
export const lightTheme = createTheme(false);

// Theme type
export type Theme = ReturnType<typeof createTheme>;

// Theme context interface
export interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

// Utility function to get responsive values
export const responsive = (values: { [key in keyof typeof breakpoints]?: any }) => {
  return values;
};

// Media query helpers for React Native Web
export const mediaQuery = {
  mobile: `@media (max-width: ${breakpoints.tablet - 1}px)`,
  tablet: `@media (min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.desktop - 1}px)`,
  desktop: `@media (min-width: ${breakpoints.desktop}px)`,
  wide: `@media (min-width: ${breakpoints.wide}px)`,
};

export default darkTheme;