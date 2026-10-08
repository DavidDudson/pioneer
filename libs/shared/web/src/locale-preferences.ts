import { DOCUMENT, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  DistanceUnit,
  DistanceUnitSchema,
  Locale,
  resolveLocale,
  SOURCE_LOCALE,
  textDirection,
} from '@pioneer/shared/kernel';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

const STORAGE_KEY = 'pioneer.locale';
const StoredPreferences = z.object({
  ui: z.string().optional(),
  content: z.string().optional(),
  distanceUnit: z.string().optional(),
});
type StoredPreferences = z.infer<typeof StoredPreferences>;

/** The browser's `Accept-Language` list, most preferred first. */
export const BROWSER_LANGUAGES = new InjectionToken<readonly string[]>('BROWSER_LANGUAGES', {
  providedIn: 'root',
  factory: (): readonly string[] => inject(DOCUMENT).defaultView?.navigator.languages ?? [],
});

/** Where preferences persist until accounts exist; `undefined` when storage is blocked. */
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

function readStored(storage: Storage | undefined): StoredPreferences {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    const parsed = StoredPreferences.safeParse(raw === null || raw === undefined ? {} : JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    // Unreadable or corrupt preferences behave like none.
    return {};
  }
}

function storedUnit(stored: string | undefined): DistanceUnit {
  const unit = DistanceUnitSchema.safeParse(stored);
  return unit.success ? unit.data : DistanceUnit.Feet;
}

/**
 * The viewer's UI and content locales. Each resolves from the stored preference, then the
 * browser's languages, then `en`. They are independent: English rules text with a German UI is
 * valid. Also the distance unit (feet as written, or metres as translated books use). Account
 * preferences slot in ahead of storage once accounts exist.
 */
@Injectable({ providedIn: 'root' })
export class LocalePreferences {
  readonly #i18n = inject(TranslocoService);
  readonly #document = inject(DOCUMENT);
  readonly #storage = inject(PREFERENCE_STORAGE);
  readonly #browser = inject(BROWSER_LANGUAGES);
  readonly #stored = readStored(this.#storage);
  readonly #ui = signal(this.#resolve(this.#stored.ui));
  readonly #content = signal(this.#resolve(this.#stored.content));
  readonly #distanceUnit = signal(storedUnit(this.#stored.distanceUnit));

  public readonly ui = this.#ui.asReadonly();
  public readonly content = this.#content.asReadonly();
  public readonly distanceUnit = this.#distanceUnit.asReadonly();

  /** Loads the UI locale's root messages and activates it. Runs once before bootstrap. */
  public async apply(): Promise<void> {
    await this.#activate(this.#ui());
  }

  /** Switches the UI locale in place: downloads only its text, then re-renders. */
  public async setUi(locale: Locale): Promise<void> {
    await this.#activate(locale);
    this.#ui.set(locale);
    this.#persist();
  }

  public setContent(locale: Locale): void {
    this.#content.set(locale);
    this.#persist();
  }

  public setDistanceUnit(unit: DistanceUnit): void {
    this.#distanceUnit.set(unit);
    this.#persist();
  }

  #resolve(stored: string | undefined): Locale {
    const candidates = stored === undefined ? this.#browser : [stored, ...this.#browser];
    return resolveLocale(candidates, Object.values(Locale), SOURCE_LOCALE);
  }

  async #activate(locale: Locale): Promise<void> {
    // Load first so the switch never renders raw keys.
    await firstValueFrom(this.#i18n.load(locale));
    this.#i18n.setActiveLang(locale);
    const root = this.#document.documentElement;
    root.lang = locale;
    root.dir = textDirection(locale);
  }

  #persist(): void {
    try {
      this.#storage?.setItem(
        STORAGE_KEY,
        JSON.stringify({ ui: this.#ui(), content: this.#content(), distanceUnit: this.#distanceUnit() }),
      );
    } catch {
      // Quota or blocked storage: the choice still applies for this session.
    }
  }
}
