import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { Locale } from '@pioneer/shared/kernel';

import { CharacterStore } from './data/character-store';

/** Lazy routes for the character bounded context. */
export const characterRoutes: Routes = [
  {
    path: '',
    providers: [
      CharacterStore,
      // Keys are `character.*`; the messages load with this route, not with the shell.
      provideTranslocoScope({
        scope: 'character',
        loader: { [Locale.English]: async () => import('../i18n/en.json') },
      }),
    ],
    children: [
      {
        path: '',
        loadComponent: async () => {
          const { CharacterListPage } = await import('./list/character-list-page/character-list-page.component');
          return CharacterListPage;
        },
      },
      {
        path: ':id',
        loadComponent: async () => {
          const { CharacterSheetPage } = await import('./sheet/character-sheet-page/character-sheet-page.component');
          return CharacterSheetPage;
        },
      },
    ],
  },
];
