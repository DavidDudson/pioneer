import type { Routes } from '@angular/router';

/** Each bounded context contributes one lazily loaded route tree. */
export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'characters' },
  {
    path: 'characters',
    loadChildren: async () => {
      const { characterRoutes } = await import('@pioneer/character/feature');
      return characterRoutes;
    },
  },
];
