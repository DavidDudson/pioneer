import type { ValueOf } from '@pioneer/shared/kernel';

/** Visual themes. Each has its own file in `styles/themes/` and supports both colour modes. */
export const Theme = { Frontier: 'frontier', Tavern: 'tavern' } as const;
export type Theme = ValueOf<typeof Theme>;

/** Colour mode. Dark is the default; light is opt-in. */
export const ColorMode = { Dark: 'dark', Light: 'light' } as const;
export type ColorMode = ValueOf<typeof ColorMode>;

/** What the viewer picked: a theme, or `dynamic`, which follows the open campaign's or character's theme. */
const DYNAMIC_THEME = 'dynamic';
export const ThemeChoice = { ...Theme, Dynamic: DYNAMIC_THEME } as const;
export type ThemeChoice = ValueOf<typeof ThemeChoice>;

/** What the viewer picked for colour mode: a mode, or `system`, which follows the device. */
const SYSTEM_MODE = 'system';
export const ModeChoice = { ...ColorMode, System: SYSTEM_MODE } as const;
export type ModeChoice = ValueOf<typeof ModeChoice>;
