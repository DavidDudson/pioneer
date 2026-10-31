import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Page, PageBody, PageHeader, SegmentedField, Stack, Surface } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import { AccountPreferences } from '@pioneer/identity/data-access';
import type { Preferences } from '@pioneer/identity/domain';
import { DistanceUnit, Locale, SOURCE_LOCALE } from '@pioneer/shared/kernel';
import { LocalePreferences } from '@pioneer/shared/web';
import { filter, merge } from 'rxjs';

import {
  localeColumns,
  localeLabel,
  localeRows,
  localeValue,
  shownLocales,
  translatedShare,
} from './locale-picker-table';
import type { LocaleRow } from './locale-picker-table';

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
  imports: [Page, PageBody, PageHeader, PickerField, SegmentedField, Stack, Surface, TranslocoPipe],
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

  /** Every locale; the list is short, so the pickers search and sort these in the page. */
  readonly #locales = computed((): readonly LocaleRow[] => {
    this.#messages();
    const source = this.#i18n.getTranslation(SOURCE_LOCALE);
    return localeRows(
      (locale) => this.#i18n.translate(LOCALE_NAMES[locale]),
      (locale) => translatedShare(source, this.#i18n.getTranslation(locale)),
    );
  });
  protected readonly uiQuery = signal('');
  protected readonly uiSort = signal<PickerSort | undefined>(undefined);
  protected readonly contentQuery = signal('');
  protected readonly contentSort = signal<PickerSort | undefined>(undefined);
  protected readonly uiLocales = computed(() => shownLocales(this.#locales(), this.uiQuery(), this.uiSort()));
  protected readonly contentLocales = computed(() =>
    shownLocales(this.#locales(), this.contentQuery(), this.contentSort()),
  );
  protected readonly localeValue = localeValue;
  protected readonly localeLabel = localeLabel;
  protected readonly localeColumns = computed(() => {
    this.#messages();
    return localeColumns({
      native: this.#i18n.translate('identity.settings.localeColumns.native'),
      english: this.#i18n.translate('identity.settings.localeColumns.english'),
      coverage: this.#i18n.translate('identity.settings.localeColumns.coverage'),
    });
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
