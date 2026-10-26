import { importProvidersFrom } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { frontierMessages } from '@pioneer/frontier';
import { rulesMessages } from '@pioneer/rules/sdk';
import { kernelMessages } from '@pioneer/shared/kernel';

import cachesMessages from '../../i18n/en.json';

/**
 * The `en` messages legal UI renders with: its own `legalCaches` scope and the `rules` book titles, preloaded with the
 * ICU transpiler, for stories.
 */
export function provideLegalUiI18nTesting(): EnvironmentProviders[] {
  return [
    importProvidersFrom(
      TranslocoTestingModule.forRoot({
        langs: { en: { ...kernelMessages, ...frontierMessages, ...rulesMessages, ...cachesMessages } },
        preloadLangs: true,
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ),
    // After the testing module, so ICU replaces its default transpiler.
    provideTranslocoMessageformat(),
  ];
}
