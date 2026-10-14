import { importProvidersFrom } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { frontierMessages } from '@pioneer/frontier';
import { diceMessages } from '@pioneer/rules/dice';
import { rulesMessages } from '@pioneer/rules/sdk';
import { kernelMessages } from '@pioneer/shared/kernel';

import rollMessages from '../../i18n/en.json';

/** What the fixtures' effects are called, so a card reads "from Juggernaut" rather than a raw key. */
const FIXTURE_MESSAGES = { fortune: 'Fortune effect', misfortune: 'Misfortune effect', juggernaut: 'Juggernaut' };

/**
 * The `en` messages play UI renders with: the roll card's own `roll` scope, the `dice` text of the rolls it explains and
 * the `rules` text of the degrees' reasons, preloaded with the ICU transpiler, for specs and stories.
 */
export function providePlayUiI18nTesting(): EnvironmentProviders[] {
  return [
    importProvidersFrom(
      TranslocoTestingModule.forRoot({
        langs: {
          en: {
            ...kernelMessages,
            ...frontierMessages,
            ...rulesMessages,
            ...diceMessages,
            roll: { ...rollMessages.roll, fixture: FIXTURE_MESSAGES },
          },
        },
        preloadLangs: true,
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ),
    // After the testing module, so ICU replaces its default transpiler.
    provideTranslocoMessageformat(),
  ];
}
