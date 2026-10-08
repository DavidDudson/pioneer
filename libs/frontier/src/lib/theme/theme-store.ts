import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

/** Visual themes. Each has its own file in `styles/themes/` and supports both colour modes. */
export const Theme = { Frontier: 'frontier', Tavern: 'tavern' } as const;
export type Theme = ValueOf<typeof Theme>;

/** Colour mode. Dark is the default; light is opt-in. */
export const ColorMode = { Dark: 'dark', Light: 'light' } as const;
export type ColorMode = ValueOf<typeof ColorMode>;

/** Storage keys. apps/web/src/index.html reads them before boot to avoid a flash of the default theme. */
const THEME_KEY = 'fr-theme';
const MODE_KEY = 'fr-mode';

function isOneOf<TValue extends string>(values: Record<string, TValue>, value: string | undefined): value is TValue {
  return Object.values<string>(values).includes(value ?? '');
}

/**
 * The viewer's theme and colour mode. Applies them as `data-theme` /
 * `data-mode` on `<html>`, which is all the CSS reads, and remembers them in
 * this browser. Storage may be unavailable (private mode, blocked site data):
 * then the choice lasts for the session only.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  readonly #document = inject(DOCUMENT);
  readonly #storage = this.#openStorage();

  public readonly theme = signal<Theme>(this.#read(THEME_KEY, Theme, Theme.Frontier));
  public readonly mode = signal<ColorMode>(this.#read(MODE_KEY, ColorMode, ColorMode.Dark));

  public constructor() {
    effect(() => {
      const theme = this.theme();
      const mode = this.mode();
      const root = this.#document.documentElement;
      root.dataset['theme'] = theme;
      root.dataset['mode'] = mode;
      this.#write(THEME_KEY, theme);
      this.#write(MODE_KEY, mode);
    });
  }

  public toggleMode(): void {
    this.mode.update((mode) => (mode === ColorMode.Dark ? ColorMode.Light : ColorMode.Dark));
  }

  #openStorage(): Storage | undefined {
    try {
      return this.#document.defaultView?.localStorage;
    } catch {
      return undefined;
    }
  }

  #read<TValue extends string>(key: string, values: Record<string, TValue>, fallback: TValue): TValue {
    try {
      const stored = this.#storage?.getItem(key) ?? undefined;
      return isOneOf(values, stored) ? stored : fallback;
    } catch {
      return fallback;
    }
  }

  #write(key: string, value: string): void {
    try {
      this.#storage?.setItem(key, value);
    } catch {
      // Storage full or blocked: the choice still applies for this session.
    }
  }
}
