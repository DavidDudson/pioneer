import { importProvidersFrom } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { kernelMessages } from '@pioneer/shared/kernel';

import messages from '../../i18n/en.json';

/** Frontier's and the kernel's `en` messages, preloaded with the ICU transpiler, for frontier specs. */
export function provideFrontierI18nTesting(): EnvironmentProviders[] {
  return [
    importProvidersFrom(
      TranslocoTestingModule.forRoot({
        langs: { en: { ...kernelMessages, ...messages } },
        preloadLangs: true,
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ),
    // After the testing module, so ICU replaces its default transpiler.
    provideTranslocoMessageformat(),
  ];
}
