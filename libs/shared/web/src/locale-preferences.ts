import { DOCUMENT, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { DistanceUnit, DistanceUnitSchema, LocaleSchema, SOURCE_LOCALE, textDirection } from '@pioneer/shared/kernel';
import type { Locale } from '@pioneer/shared/kernel';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

const STORAGE_KEY = 'pioneer.locale';

/** The choices a signed-in user made; a field left out shows the default. */
export interface DisplayChoices {
  readonly ui?: Locale | undefined;
  readonly content?: Locale | undefined;
  readonly distanceUnit?: DistanceUnit | undefined;
}

/** The cache as stored; each field is checked on its own, so one unknown value loses only itself. */
const CachedChoices = z.object({ ui: z.unknown(), content: z.unknown(), distanceUnit: z.unknown() }).partial();

/** Where the signed-in user's choices are cached between visits; `undefined` when storage is blocked. */
export const PREFERENCE_STORAGE = new InjectionToken<Storage | undefined>('PREFERENCE_STORAGE', {
  providedIn: 'root',
  factory: (): Storage | undefined => {
    try {
      return inject(DOCUMENT).defaultView?.localStorage;
    } catch {
      // Storage access throws when the browser blocks it (privacy settings, sandboxed frames).
      return undefined;
    }
  },
});

function readCached(storage: Storage | undefined): DisplayChoices {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    const parsed = CachedChoices.safeParse(raw === null || raw === undefined ? {} : JSON.parse(raw));
    if (!parsed.success) {
      return {};
    }
    return {
      ui: LocaleSchema.safeParse(parsed.data.ui).data,
      content: LocaleSchema.safeParse(parsed.data.content).data,
      distanceUnit: DistanceUnitSchema.safeParse(parsed.data.distanceUnit).data,
    };
  } catch {
    // Unreadable or corrupt choices behave like none.
    return {};
  }
}

/**
 * The viewer's UI locale, content locale and distance unit. A signed-in user's account choices
 * win; anything not chosen, and everything for signed-out visitors, is the default: the source
 * locale (`en`) and feet as written. The two locales are independent: English rules text with a
 * German UI is valid.
 *
 * Identity owns the account: it calls `adopt` with the signed-in user's choices and `reset` when
 * nobody is signed in. The last adopted choices are cached in storage, so a returning user's
 * locale applies before bootstrap instead of after `/api/me` answers.
 */
@Injectable({ providedIn: 'root' })
export class LocalePreferences {
  readonly #i18n = inject(TranslocoService);
  readonly #document = inject(DOCUMENT);
  readonly #storage = inject(PREFERENCE_STORAGE);
  readonly #cached = readCached(this.#storage);
  readonly #ui = signal(this.#cached.ui ?? SOURCE_LOCALE);
  readonly #content = signal(this.#cached.content ?? SOURCE_LOCALE);
  readonly #distanceUnit = signal(this.#cached.distanceUnit ?? DistanceUnit.Feet);

  public readonly ui = this.#ui.asReadonly();
  public readonly content = this.#content.asReadonly();
  public readonly distanceUnit = this.#distanceUnit.asReadonly();

  /** Loads the UI locale's root messages and activates it. Runs once before bootstrap. */
  public async apply(): Promise<void> {
    await this.#activate(this.#ui());
  }

  /**
   * Shows the signed-in user's choices, defaults for the rest. A new UI locale downloads only its
   * text, then re-renders.
   */
  public async adopt(choices: DisplayChoices): Promise<void> {
    // Activating the current locale again is cheap: its messages are already loaded.
    const ui = choices.ui ?? SOURCE_LOCALE;
    await this.#activate(ui);
    this.#ui.set(ui);
    this.#content.set(choices.content ?? SOURCE_LOCALE);
    this.#distanceUnit.set(choices.distanceUnit ?? DistanceUnit.Feet);
    this.#cache(choices);
  }

  /** Nobody is signed in: back to the defaults, and forget the cached choices. */
  public async reset(): Promise<void> {
    try {
      await this.adopt({});
    } finally {
      // Even if the default locale fails to load, the signed-out user's choices must not outlive them.
      this.#forgetCache();
    }
  }

  async #activate(locale: Locale): Promise<void> {
    // Load first so the switch never renders raw keys.
    await firstValueFrom(this.#i18n.load(locale));
    this.#i18n.setActiveLang(locale);
    const root = this.#document.documentElement;
    root.lang = locale;
    root.dir = textDirection(locale);
  }

  #forgetCache(): void {
    try {
      this.#storage?.removeItem(STORAGE_KEY);
    } catch {
      // Blocked storage has nothing cached.
    }
  }

  #cache(choices: DisplayChoices): void {
    try {
      this.#storage?.setItem(STORAGE_KEY, JSON.stringify(choices));
    } catch {
      // Quota or blocked storage: the choices still apply for this visit.
    }
  }
}
