import { importProvidersFrom } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { frontierMessages } from '@pioneer/frontier';
import { rulesMessages } from '@pioneer/rules/sdk';
import { kernelMessages } from '@pioneer/shared/kernel';

/** The `en` messages rich text renders with, preloaded with the ICU transpiler, and a router for links. */
export function provideRichTextTesting(): EnvironmentProviders[] {
  return [
    provideRouter([]),
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
