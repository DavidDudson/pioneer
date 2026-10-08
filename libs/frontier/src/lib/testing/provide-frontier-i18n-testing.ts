import { importProvidersFrom } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';

import messages from '../../i18n/en.json';

/** Frontier's `en` messages, preloaded with the ICU transpiler, for frontier component specs. */
export function provideFrontierI18nTesting(): EnvironmentProviders[] {
  return [
    importProvidersFrom(
      TranslocoTestingModule.forRoot({
        langs: { en: messages },
        preloadLangs: true,
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ),
    // After the testing module, so ICU replaces its default transpiler.
    provideTranslocoMessageformat(),
  ];
}
