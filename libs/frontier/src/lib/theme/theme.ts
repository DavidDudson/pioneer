import type { ValueOf } from '@pioneer/shared/kernel';

/** Visual themes. Each has its own file in `styles/themes/` and supports both colour modes. */
export const Theme = { Frontier: 'frontier', Tavern: 'tavern' } as const;
export type Theme = ValueOf<typeof Theme>;

/** Colour mode. Dark is the default; light is opt-in. */
export const ColorMode = { Dark: 'dark', Light: 'light' } as const;
export type ColorMode = ValueOf<typeof ColorMode>;
