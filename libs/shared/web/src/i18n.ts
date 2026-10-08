import {
  inject,
  Injectable,
  InjectionToken,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { Locale, LocaleSchema, SOURCE_LOCALE } from '@pioneer/shared/kernel';

import { LocalePreferences } from './locale-preferences';

/** How to fetch each locale's root messages. Keys are ICU MessageFormat strings. */
export type LocaleMessages = Readonly<Record<Locale, () => Promise<Translation>>>;

const LOCALE_MESSAGES = new InjectionToken<LocaleMessages>('LOCALE_MESSAGES');

@Injectable()
class MessageLoader implements TranslocoLoader {
  readonly #messages = inject(LOCALE_MESSAGES);

  public async getTranslation(lang: string): Promise<Translation> {
    const locale = LocaleSchema.safeParse(lang);
    if (!locale.success) {
      throw new Error(`No messages for locale "${lang}"`);
    }
    return this.#messages[locale.data]();
  }
}

/**
 * Runtime i18n: one build, locale switched with `LocalePreferences.setUi`.
 * The viewer's locale loads before bootstrap so the shell never renders keys.
 */
export function provideI18n(messages: LocaleMessages): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: LOCALE_MESSAGES, useValue: messages },
    provideTransloco({
      config: {
        availableLangs: Object.values(Locale),
        defaultLang: SOURCE_LOCALE,
        fallbackLang: SOURCE_LOCALE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
      },
      loader: MessageLoader,
    }),
    provideTranslocoMessageformat(),
    provideAppInitializer(async () => {
      await inject(LocalePreferences).apply();
    }),
  ]);
}
