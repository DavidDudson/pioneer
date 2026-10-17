import { importProvidersFrom } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { frontierMessages } from '@pioneer/frontier';
import { rulesMessages } from '@pioneer/rules/sdk';
import { kernelMessages } from '@pioneer/shared/kernel';

import browserMessages from '../../i18n/en.json';

/**
 * The `en` messages content UI renders with: the browser's own `contentBrowser` scope, and the `rules` text of the
 * entry card and the facets, preloaded with the ICU transpiler, for specs and stories.
 */
export function provideContentUiI18nTesting(): EnvironmentProviders[] {
  return [
    importProvidersFrom(
      TranslocoTestingModule.forRoot({
        langs: { en: { ...kernelMessages, ...frontierMessages, ...rulesMessages, ...browserMessages } },
        preloadLangs: true,
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ),
    // After the testing module, so ICU replaces its default transpiler.
    provideTranslocoMessageformat(),
  ];
}
