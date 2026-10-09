import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Page, SegmentedField, SelectField, Stack, Surface } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { AccountPreferences } from '@pioneer/identity/data-access';
import type { Preferences } from '@pioneer/identity/domain';
import { DistanceUnit, Locale } from '@pioneer/shared/kernel';
import { LocalePreferences } from '@pioneer/shared/web';
import { filter, merge } from 'rxjs';

/** Each locale's name, spelled out so the message check sees every key. */
const LOCALE_NAMES = {
  [Locale.English]: 'identity.settings.locales.en',
} as const satisfies Record<Locale, string>;

const DISTANCE_UNIT_NAMES = {
  [DistanceUnit.Feet]: 'identity.settings.distanceUnits.feet',
  [DistanceUnit.Metres]: 'identity.settings.distanceUnits.metres',
} as const satisfies Record<DistanceUnit, string>;

/** A preference the page saves, for telling the user which one failed. */
type PreferenceField = keyof Preferences;

/**
 * The signed-in user's display preferences: UI language, content language and distance unit. Each
 * applies and saves to the account as it changes; if a save fails, what the account saved comes back
 * and that field says so. Signed-out visitors never get here (`signInRequired`) and see the defaults.
 * One tap is the whole edit, so there is no pending or saved marker: the change shows at once.
 */
@Component({
  selector: 'pio-settings-page',
  imports: [Page, SegmentedField, SelectField, Stack, Surface, TranslocoPipe],
  templateUrl: './settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  protected readonly shown = inject(LocalePreferences);
  readonly #account = inject(AccountPreferences);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the locale changes or the `identity` message scope finishes loading. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly locales = computed((): readonly SelectOption<Locale>[] => {
    this.#messages();
    return Object.values(Locale).map((locale) => ({
      value: locale,
      label: this.#i18n.translate(LOCALE_NAMES[locale]),
    }));
  });
  protected readonly distanceUnits = computed((): readonly SelectOption<DistanceUnit>[] => {
    this.#messages();
    return Object.values(DistanceUnit).map((unit) => ({
      value: unit,
      label: this.#i18n.translate(DISTANCE_UNIT_NAMES[unit]),
    }));
  });

  /** The field whose last change the account could not save, until the next change. */
  readonly #failed = signal<PreferenceField | undefined>(undefined);
  readonly #saveFailed = computed((): string => {
    this.#messages();
    return this.#i18n.translate('identity.settings.saveFailed');
  });
  protected readonly uiError = computed((): string | undefined => this.#errorFor('uiLocale'));
  protected readonly contentError = computed((): string | undefined => this.#errorFor('contentLocale'));
  protected readonly distanceUnitError = computed((): string | undefined => this.#errorFor('distanceUnit'));

  protected async chooseUi(locale: Locale | undefined): Promise<void> {
    if (locale !== undefined) {
      await this.#save({ uiLocale: locale }, 'uiLocale');
    }
  }

  protected async chooseContent(locale: Locale | undefined): Promise<void> {
    if (locale !== undefined) {
      await this.#save({ contentLocale: locale }, 'contentLocale');
    }
  }

  /** The segmented control ignores a press on the chosen unit, so every change is a new one. */
  protected async chooseDistanceUnit(unit: DistanceUnit | undefined): Promise<void> {
    if (unit !== undefined) {
      await this.#save({ distanceUnit: unit }, 'distanceUnit');
    }
  }

  #errorFor(field: PreferenceField): string | undefined {
    return this.#failed() === field ? this.#saveFailed() : undefined;
  }

  async #save(patch: Preferences, field: PreferenceField): Promise<void> {
    this.#failed.set(undefined);
    try {
      await this.#account.update(patch);
    } catch {
      // What the account saved is back on screen; the field says why.
      this.#failed.set(field);
    }
  }
}
