import { inject } from '@angular/core';
import type { Routes } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import type { SheetSidePanelLoader } from '@pioneer/character/feature';
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
    // The sheet's side panel searches the rules content, which the character feature may not import.
    loadChildren: async () => {
      const { characterRoutes, SHEET_SIDE_PANEL } = await import('@pioneer/character/feature');
      return [
        {
          path: '',
          providers: [
            {
              provide: SHEET_SIDE_PANEL,
              useFactory: (): SheetSidePanelLoader => {
                const i18n = inject(TranslocoService);
                // The content feature loads when the drawer first needs it, not with the sheet.
                return async () => {
                  const { loadSidePanel } = await import('@pioneer/content/feature');
                  return loadSidePanel(i18n);
                };
              },
            },
          ],
          children: characterRoutes,
        },
      ];
    },
  },
  {
    // An invite link, unguarded: the page takes its token out of the URL before any 401 prompts sign-in.
    path: 'campaigns/join',
    loadChildren: async () => {
      const { campaignJoinRoutes } = await import('@pioneer/campaign/feature');
      return campaignJoinRoutes;
    },
  },
  {
    path: 'campaigns',
    // Campaigns are groups of accounts, so they need one too.
    canActivate: [signInRequired],
    runGuardsAndResolvers: 'always',
    // The key item picker searches the rules content, which the campaign feature may not import.
    loadChildren: async () => {
      const [{ campaignRoutes, KEY_ITEM_CONTENT_SEARCH }, { keyItemContentSearch }, { ContentLoader }] =
        await Promise.all([
          import('@pioneer/campaign/feature'),
          import('./key-item-content-search'),
          import('@pioneer/rules/data-access'),
        ]);
      return [
        {
          path: '',
          providers: [
            { provide: KEY_ITEM_CONTENT_SEARCH, useFactory: () => keyItemContentSearch(inject(ContentLoader)) },
          ],
          children: campaignRoutes,
        },
      ];
    },
  },
  {
    path: 'homebrew',
    // Packs belong to an account.
    canActivate: [signInRequired],
    runGuardsAndResolvers: 'always',
    loadChildren: async () => {
      const { homebrewRoutes } = await import('@pioneer/homebrew/feature');
      return homebrewRoutes;
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
    // The content browser is public, like Legal: content needs no account (ADR-0007).
    path: 'content',
    loadChildren: async () => {
      const { contentRoutes } = await import('@pioneer/content/feature');
      return contentRoutes;
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
