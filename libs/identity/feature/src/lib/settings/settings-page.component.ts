import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Message, Page, SegmentedField, SelectField, Stack, Surface } from '@pioneer/frontier';
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

/**
 * The signed-in user's display preferences: UI language, content language and distance unit. Each
 * applies and saves to the account as it changes; if the save fails it is undone and the page says
 * so. Signed-out visitors never get here (`signInRequired`) and see the defaults.
 */
@Component({
  selector: 'pio-settings-page',
  imports: [Message, Page, SegmentedField, SelectField, Stack, Surface, TranslocoPipe],
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

  /** True after a change the account could not save, until the next change. */
  protected readonly saveFailed = signal(false);

  protected async chooseUi(locale: Locale | undefined): Promise<void> {
    if (locale !== undefined) {
      await this.#save({ uiLocale: locale });
    }
  }

  protected async chooseContent(locale: Locale | undefined): Promise<void> {
    if (locale !== undefined) {
      await this.#save({ contentLocale: locale });
    }
  }

  /** The segmented control ignores a press on the chosen unit, so every change is a new one. */
  protected async chooseDistanceUnit(unit: DistanceUnit | undefined): Promise<void> {
    if (unit !== undefined) {
      await this.#save({ distanceUnit: unit });
    }
  }

  async #save(patch: Preferences): Promise<void> {
    this.saveFailed.set(false);
    try {
      await this.#account.update(patch);
    } catch {
      // The previous choice is back on screen; the message says why.
      this.saveFailed.set(true);
    }
  }
}
