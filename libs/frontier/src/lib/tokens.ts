import type { ValueOf } from '@pioneer/shared/kernel';

/** Spacing token names. Components take these, never raw lengths. */
export const Space = {
  None: 'none',
  Xs3: '3xs',
  Xs2: '2xs',
  Xs: 'xs',
  Sm: 'sm',
  Md: 'md',
  Lg: 'lg',
  Xl: 'xl',
  Xl2: '2xl',
  Xl3: '3xl',
} as const;
export type Space = ValueOf<typeof Space>;

/** Semantic intent, shared by text, buttons and feedback. */
export const Tone = {
  Default: 'default',
  Muted: 'muted',
  Subtle: 'subtle',
  Accent: 'accent',
  Danger: 'danger',
  Success: 'success',
  Warning: 'warning',
  Info: 'info',
} as const;
export type Tone = ValueOf<typeof Tone>;

export const Size = {
  Sm: 'sm',
  Md: 'md',
  Lg: 'lg',
} as const;
export type Size = ValueOf<typeof Size>;

/**
 * Container widths layout primitives expand at (24 / 40 / 56rem). Narrower
 * than `sm` is the unnamed base: design for it first and only grow from here.
 * These measure the primitive's own width, never the viewport.
 */
export const Container = {
  Sm: 'sm',
  Md: 'md',
  Lg: 'lg',
} as const;
export type Container = ValueOf<typeof Container>;

/** Literal class maps so Tailwind's scanner sees every class. */
export const GAP: Record<Space, string> = {
  none: 'gap-none',
  '3xs': 'gap-3xs',
  '2xs': 'gap-2xs',
  xs: 'gap-xs',
  sm: 'gap-sm',
  md: 'gap-md',
  lg: 'gap-lg',
  xl: 'gap-xl',
  '2xl': 'gap-2xl',
  '3xl': 'gap-3xl',
};

export const PADDING: Record<Space, string> = {
  none: 'p-none',
  '3xs': 'p-3xs',
  '2xs': 'p-2xs',
  xs: 'p-xs',
  sm: 'p-sm',
  md: 'p-md',
  lg: 'p-lg',
  xl: 'p-xl',
  '2xl': 'p-2xl',
  '3xl': 'p-3xl',
};

export const TEXT_TONE: Record<Tone, string> = {
  default: 'text-fg-default',
  muted: 'text-fg-muted',
  subtle: 'text-fg-subtle',
  accent: 'text-accent-fg',
  danger: 'text-danger-fg',
  success: 'text-success-fg',
  warning: 'text-warning-fg',
  info: 'text-info-fg',
};
