import type { EnvironmentProviders, Provider } from '@angular/core';
import type { Routes } from '@angular/router';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, PREFETCH_WHEN_IDLE, provideMessageScope } from '@pioneer/shared/web';

import { CampaignStore } from './data/campaign-store';

/** What every campaign page needs: its server state and its messages. */
function campaignProviders(): (Provider | EnvironmentProviders)[] {
  return [CampaignStore, provideMessageScope('campaign', { [Locale.English]: async () => import('../i18n/en.json') })];
}

/** Lazy routes for the campaign bounded context. */
export const campaignRoutes: Routes = [
  {
    path: '',
    providers: campaignProviders(),
    children: [
      {
        path: '',
        loadComponent: loadWithMessages(async () => {
          const { CampaignListPage } = await import('./list/campaign-list-page/campaign-list-page.component');
          return CampaignListPage;
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

/**
 * The invite link's page, `/campaigns/join#<token>`. Mounted outside the sign-in guard: the page
 * takes the token out of the URL before anything can send a signed-out visitor to sign in, so the
 * token never reaches a server in a URL.
 */
export const campaignJoinRoutes: Routes = [
  {
    path: '',
    providers: campaignProviders(),
    loadComponent: loadWithMessages(async () => {
      const { CampaignJoinPage } = await import('./join/campaign-join-page/campaign-join-page.component');
      return CampaignJoinPage;
    }),
  },
];
