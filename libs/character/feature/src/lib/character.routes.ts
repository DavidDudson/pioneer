import type { Routes } from '@angular/router';

import { CharacterStore } from './data/character-store';

/** Lazy routes for the character bounded context. */
export const characterRoutes: Routes = [
  {
    path: '',
    providers: [CharacterStore],
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
