import type { Routes } from '@angular/router';
import { PREFETCH_WHEN_IDLE } from '@pioneer/shared/web';

/** Each bounded context contributes one lazily loaded route tree. */
export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'characters' },
  {
    path: 'characters',
    data: PREFETCH_WHEN_IDLE,
    loadChildren: async () => {
      const { characterRoutes } = await import('@pioneer/character/feature');
      return characterRoutes;
    },
  },
  {
    path: 'legal',
    loadChildren: async () => {
      const { legalRoutes } = await import('@pioneer/legal/feature');
      return legalRoutes;
    },
  },
  {
    path: 'play',
    loadChildren: async () => {
      const { playRoutes } = await import('@pioneer/play/feature');
      return playRoutes;
    },
  },
];
