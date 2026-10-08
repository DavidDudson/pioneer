import type { Routes } from '@angular/router';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, PREFETCH_WHEN_IDLE, provideMessageScope } from '@pioneer/shared/web';

import { CharacterStore } from './data/character-store';

/** Lazy routes for the character bounded context. */
export const characterRoutes: Routes = [
  {
    path: '',
    providers: [
      CharacterStore,
      provideMessageScope('character', { [Locale.English]: async () => import('../i18n/en.json') }),
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
