import type { Routes } from '@angular/router';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, PREFETCH_WHEN_IDLE, provideMessageScope } from '@pioneer/shared/web';

import { CampaignStore } from './data/campaign-store';

/** Lazy routes for the campaign bounded context. */
export const campaignRoutes: Routes = [
  {
    path: '',
    providers: [
      CampaignStore,
      provideMessageScope('campaign', { [Locale.English]: async () => import('../i18n/en.json') }),
    ],
    children: [
      {
        path: '',
        loadComponent: loadWithMessages(async () => {
          const { CampaignListPage } = await import('./list/campaign-list-page/campaign-list-page.component');
          return CampaignListPage;
        }),
      },
      {
        // An invite link. The parent route's sign-in guard brings an anonymous visitor back here.
        path: 'join/:token',
        loadComponent: loadWithMessages(async () => {
          const { CampaignJoinPage } = await import('./join/campaign-join-page/campaign-join-page.component');
          return CampaignJoinPage;
        }),
      },
      {
        path: ':id',
        // Opening a campaign is the likely next step from the list.
        data: PREFETCH_WHEN_IDLE,
        loadComponent: loadWithMessages(async () => {
          const { CampaignHomePage } = await import('./home/campaign-home-page/campaign-home-page.component');
          return CampaignHomePage;
        }),
      },
    ],
  },
];
