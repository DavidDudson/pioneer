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

/** Semantic insets (`semantic.css`): what a control, a panel and a page pad themselves with. */
export const Inset = {
  Control: 'inset-control',
  Panel: 'inset-panel',
  Page: 'inset-page',
} as const;

export type Inset = ValueOf<typeof Inset>;

/** A padding a component takes: a spacing step, or an inset by role. */
export type Padding = Space | Inset;

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

/**
 * Shared CVA variant maps. Every class string is a literal so Tailwind's
 * scanner sees it; components spread these into their own `cva()` configs.
 */
export const gapVariants = {
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
} as const satisfies Record<Space, string>;

export const paddingVariants = {
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
  'inset-control': 'p-inset-control',
  'inset-panel': 'p-inset-panel',
  'inset-page': 'p-inset-page',
} as const satisfies Record<Padding, string>;

export const paddingBlockVariants = {
  none: 'py-none',
  '3xs': 'py-3xs',
  '2xs': 'py-2xs',
  xs: 'py-xs',
  sm: 'py-sm',
  md: 'py-md',
  lg: 'py-lg',
  xl: 'py-xl',
  '2xl': 'py-2xl',
  '3xl': 'py-3xl',
  'inset-control': 'py-inset-control',
  'inset-panel': 'py-inset-panel',
  'inset-page': 'py-inset-page',
} as const satisfies Record<Padding, string>;

export const paddingInlineVariants = {
  none: 'px-none',
  '3xs': 'px-3xs',
  '2xs': 'px-2xs',
  xs: 'px-xs',
  sm: 'px-sm',
  md: 'px-md',
  lg: 'px-lg',
  xl: 'px-xl',
  '2xl': 'px-2xl',
  '3xl': 'px-3xl',
  'inset-control': 'px-inset-control',
  'inset-panel': 'px-inset-panel',
  'inset-page': 'px-inset-page',
} as const satisfies Record<Padding, string>;

/**
 * Elevation: how far a surface sits above the page. A level is a surface and its line, so a component takes both
 * from one name and never pairs `bg-surface-*` with `border-line-*` by hand. Flat is the page's own plane (shell
 * bars), raised a panel on it, overlay anything that floats over the page, modal what blocks the page.
 */
export const Elevation = {
  Flat: 'flat',
  Raised: 'raised',
  Overlay: 'overlay',
  Modal: 'modal',
} as const;

export type Elevation = ValueOf<typeof Elevation>;

/** Surface and line colour of each level. The border width stays with the component. */
export const elevationVariants = {
  flat: 'bg-elevation-flat border-elevation-flat-line',
  raised: 'bg-elevation-raised border-elevation-raised-line',
  overlay: 'bg-elevation-overlay border-elevation-overlay-line',
  modal: 'bg-elevation-modal border-elevation-modal-line',
} as const satisfies Record<Elevation, string>;

export const toneVariants = {
  default: 'text-fg-default',
  muted: 'text-fg-muted',
  subtle: 'text-fg-subtle',
  accent: 'text-accent-fg',
  danger: 'text-danger-fg',
  success: 'text-success-fg',
  warning: 'text-warning-fg',
  info: 'text-info-fg',
} as const satisfies Record<Tone, string>;

/** Damage types a roll's dice and numbers are coloured by. Physical covers bludgeoning, piercing and slashing. */
export const DamageTone = {
  Physical: 'physical',
  Holy: 'holy',
  Fire: 'fire',
  Cold: 'cold',
  Electricity: 'electricity',
  Acid: 'acid',
  Poison: 'poison',
  Sonic: 'sonic',
  Force: 'force',
  Mental: 'mental',
  Void: 'void',
  Vitality: 'vitality',
  Spirit: 'spirit',
  Bleed: 'bleed',
} as const;

export type DamageTone = ValueOf<typeof DamageTone>;

export const damageToneVariants = {
  physical: 'text-damage-physical',
  holy: 'text-damage-holy',
  fire: 'text-damage-fire',
  cold: 'text-damage-cold',
  electricity: 'text-damage-electricity',
  acid: 'text-damage-acid',
  poison: 'text-damage-poison',
  sonic: 'text-damage-sonic',
  force: 'text-damage-force',
  mental: 'text-damage-mental',
  void: 'text-damage-void',
  vitality: 'text-damage-vitality',
  spirit: 'text-damage-spirit',
  bleed: 'text-damage-bleed',
} as const satisfies Record<DamageTone, string>;
