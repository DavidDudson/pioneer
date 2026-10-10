import type { Routes } from '@angular/router';
import { signInRequired } from '@pioneer/identity/data-access';
import { PREFETCH_WHEN_IDLE } from '@pioneer/shared/web';

/** Each bounded context contributes one lazily loaded route tree. */
export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'characters' },
  {
    path: 'characters',
    // Saved characters need an account (ADR-0007); content stays public.
    canActivate: [signInRequired],
    // Signing out re-runs guards on the current page (SessionStore), so it is left at once.
    runGuardsAndResolvers: 'always',
    data: PREFETCH_WHEN_IDLE,
    loadChildren: async () => {
      const { characterRoutes } = await import('@pioneer/character/feature');
      return characterRoutes;
    },
  },
  {
    path: 'campaigns',
    // Campaigns are groups of accounts, so they need one too.
    canActivate: [signInRequired],
    runGuardsAndResolvers: 'always',
    loadChildren: async () => {
      const { campaignRoutes } = await import('@pioneer/campaign/feature');
      return campaignRoutes;
    },
  },
  {
    path: 'account',
    loadChildren: async () => {
      const { identityRoutes } = await import('@pioneer/identity/feature');
      return identityRoutes;
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
