import type { Routes } from '@angular/router';
import { engineMessages } from '@pioneer/rules/engine';
import { formulaMessages } from '@pioneer/rules/formula';
import { predicateMessages } from '@pioneer/rules/predicate';
import { rulesMessages } from '@pioneer/rules/sdk';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, PREFETCH_WHEN_IDLE, provideMessageScope } from '@pioneer/shared/web';

import { CharacterStore } from './data/character-store';

/**
 * Lazy routes for the character bounded context. The sheet renders engine output, so rules text from `rules/sdk`,
 * `rules/formula`, `rules/predicate` and `rules/engine` loads as their own `rules`, `formula`, `predicate` and
 * `engine` scopes.
 */
export const characterRoutes: Routes = [
  {
    path: '',
    providers: [
      CharacterStore,
      provideMessageScope('character', { [Locale.English]: async () => import('../i18n/en.json') }),
      provideMessageScope('rules', { [Locale.English]: async () => rulesMessages.rules }),
      provideMessageScope('formula', { [Locale.English]: async () => formulaMessages.formula }),
      provideMessageScope('predicate', { [Locale.English]: async () => predicateMessages.predicate }),
      provideMessageScope('engine', { [Locale.English]: async () => engineMessages.engine }),
    ],
    children: [
      {
        path: '',
        loadComponent: loadWithMessages(async () => {
          const { CharacterListPage } = await import('./list/character-list-page/character-list-page.component');
          return CharacterListPage;
        }),
      },
      {
        path: 'import/pathbuilder',
        loadComponent: loadWithMessages(async () => {
          const { PathbuilderImportPage } =
            await import('./import/pathbuilder-import-page/pathbuilder-import-page.component');
          return PathbuilderImportPage;
        }),
      },
      {
        path: ':id',
        // Opening a character is the likely next step from the list.
        data: PREFETCH_WHEN_IDLE,
        loadComponent: loadWithMessages(async () => {
          const { CharacterSheetPage } = await import('./sheet/character-sheet-page/character-sheet-page.component');
          return CharacterSheetPage;
        }),
      },
    ],
  },
];
