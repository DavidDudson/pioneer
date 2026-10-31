import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';

import { ColorMode, ModeChoice, Theme, ThemeChoice } from './theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Storage keys. apps/web/src/index.html reads them before boot to avoid a flash of the default theme. */
const THEME_KEY = 'fr-theme';
const MODE_KEY = 'fr-mode';

function isOneOf<TValue extends string>(values: Record<string, TValue>, value: string | undefined): value is TValue {
  return Object.values<string>(values).includes(value ?? '');
}

/**
 * The viewer's theme choice and colour mode. Applies the theme and mode as `data-theme` /
 * `data-mode` on `<html>`, which is all the CSS reads, and remembers them in
 * this browser. Storage may be unavailable (private mode, blocked site data):
 * then the choice lasts for the session only.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  readonly #document = inject(DOCUMENT);
  readonly #storage = this.#openStorage();

  /** The viewer's pick. The default, dynamic, follows `context`. */
  public readonly choice = signal<ThemeChoice>(this.#read(THEME_KEY, ThemeChoice, ThemeChoice.Dynamic));
  /** The theme of the open campaign or character, set by the page that shows it; `undefined` when there is none. */
  public readonly context = signal<Theme | undefined>(undefined);
  /** The theme in use: the pick, or for dynamic the context's, falling back to Frontier. */
  public readonly theme = computed<Theme>(() => {
    const choice = this.choice();
    return choice === ThemeChoice.Dynamic ? (this.context() ?? Theme.Frontier) : choice;
  });
  /** The viewer's pick for colour mode; `system` follows the device. */
  public readonly modeChoice = signal<ModeChoice>(this.#read(MODE_KEY, ModeChoice, ModeChoice.Dark));
  readonly #systemDark = this.#watchSystemDark();
  /** The mode in use: the pick, or for system the device's. */
  public readonly mode = computed<ColorMode>(() => {
    const choice = this.modeChoice();
    if (choice === ModeChoice.System) {
      return this.#systemDark() ? ColorMode.Dark : ColorMode.Light;
    }
    return choice;
  });

  public constructor() {
    effect(() => {
      const theme = this.theme();
      const mode = this.mode();
      const root = this.#document.documentElement;
      root.dataset['theme'] = theme;
      root.dataset['mode'] = mode;
      this.#write(THEME_KEY, this.choice());
      this.#write(MODE_KEY, this.modeChoice());
    });
  }

  /** Whether the device prefers dark, kept up to date; dark where the browser cannot say. */
  #watchSystemDark(): Signal<boolean> {
    const dark = signal(true);
    try {
      const query = this.#document.defaultView?.matchMedia(DARK_QUERY);
      dark.set(query?.matches ?? true);
      query?.addEventListener('change', (event) => {
        dark.set(event.matches);
      });
    } catch {
      // No matchMedia (a locked-down or test browser): stay on the dark default.
    }
    return dark.asReadonly();
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
