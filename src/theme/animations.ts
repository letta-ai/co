// Letta Brand Animation System

// Duration constants (in milliseconds)
export const duration = {
  instant: 0,
  fast: 200,
  normal: 300,
  slow: 400,
  slower: 600,
} as const;

// Easing functions
export const easing = {
  // Standard easing
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Custom cubic-bezier curves
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const;

// Pre-defined animation configurations
export const animations = {
  // Micro-interactions
  buttonHover: {
    duration: duration.fast,
    easing: easing.smooth,
    transform: 'scale(1.02)',
  },
  buttonPress: {
    duration: duration.fast,
    easing: easing.sharp,
    transform: 'scale(0.98)',
  },

  // Message animations
  messageAppear: {
    duration: duration.normal,
    easing: easing.smooth,
    from: { opacity: 0, transform: 'translateY(10px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
  },
  reasoningReveal: {
    duration: duration.slow,
    easing: easing.smooth,
    from: { opacity: 0, maxHeight: 0 },
    to: { opacity: 1, maxHeight: '200px' },
  },

  // Loading states
  pulse: {
    duration: 1500,
    easing: easing.easeInOut,
    iterationCount: 'infinite',
    direction: 'alternate',
    from: { opacity: 0.4 },
    to: { opacity: 1 },
  },
  spin: {
    duration: 1000,
    easing: easing.linear,
    iterationCount: 'infinite',
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },

  // Layout transitions
  slideIn: {
    duration: duration.normal,
    easing: easing.smooth,
    from: { transform: 'translateX(-100%)' },
    to: { transform: 'translateX(0%)' },
  },
  slideOut: {
    duration: duration.normal,
    easing: easing.smooth,
    from: { transform: 'translateX(0%)' },
    to: { transform: 'translateX(-100%)' },
  },
  fadeIn: {
    duration: duration.normal,
    easing: easing.smooth,
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    duration: duration.fast,
    easing: easing.smooth,
    from: { opacity: 1 },
    to: { opacity: 0 },
  },

  // Focus states
  focusGlow: {
    duration: duration.fast,
    easing: easing.smooth,
    boxShadow: '0 0 20px rgba(0, 102, 255, 0.4)',
  },

  // Geometric loading (Letta-specific)
  geometricAssembly: {
    duration: duration.slower,
    easing: easing.bounce,
    keyframes: [
      { transform: 'scale(0) rotate(0deg)', opacity: 0 },
      { transform: 'scale(0.5) rotate(180deg)', opacity: 0.5 },
      { transform: 'scale(1) rotate(360deg)', opacity: 1 },
    ],
  },
} as const;

// Animation utility functions
export const createKeyframes = (keyframes: Record<string, any>) => {
  return Object.entries(keyframes)
    .map(([key, value]) => `${key} { ${Object.entries(value).map(([prop, val]) => `${prop}: ${val};`).join(' ')} }`)
    .join(' ');
};

export const createTransition = (
  property: string | string[],
  duration: number = 300,
  easing: string = 'ease-in-out'
) => {
  const properties = Array.isArray(property) ? property : [property];
  return properties.map(prop => `${prop} ${duration}ms ${easing}`).join(', ');
};

export type Duration = typeof duration;
export type Easing = typeof easing;
export type Animations = typeof animations;