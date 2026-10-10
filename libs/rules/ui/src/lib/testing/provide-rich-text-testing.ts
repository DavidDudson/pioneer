import { importProvidersFrom } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { frontierMessages } from '@pioneer/frontier';
import { rulesMessages } from '@pioneer/rules/sdk';
import { kernelMessages } from '@pioneer/shared/kernel';

/** The `en` messages rules UI renders with, preloaded with the ICU transpiler, for specs and stories. */
export function provideRulesUiI18nTesting(): EnvironmentProviders[] {
  return [
    importProvidersFrom(
      TranslocoTestingModule.forRoot({
        langs: { en: { ...kernelMessages, ...frontierMessages, ...rulesMessages } },
        preloadLangs: true,
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ),
    // After the testing module, so ICU replaces its default transpiler.
    provideTranslocoMessageformat(),
  ];
}

/** Rules UI's `en` messages and a router for links, for rich text specs. */
export function provideRichTextTesting(): EnvironmentProviders[] {
  return [provideRouter([]), ...provideRulesUiI18nTesting()];
}
