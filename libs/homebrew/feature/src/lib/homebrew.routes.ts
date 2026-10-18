import type { EnvironmentProviders, Provider } from '@angular/core';
import type { Routes } from '@angular/router';
import { CRUMB } from '@pioneer/frontier';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, PREFETCH_WHEN_IDLE, provideMessageScope } from '@pioneer/shared/web';

import { packCrumb } from './crumbs';
import { HomebrewStore } from './data/homebrew-store';

/** What every homebrew page needs: its server state and its messages. */
function homebrewProviders(): (Provider | EnvironmentProviders)[] {
  return [HomebrewStore, provideMessageScope('homebrew', { [Locale.English]: async () => import('../i18n/en.json') })];
}

/** Lazy routes for the homebrew bounded context. */
export const homebrewRoutes: Routes = [
  {
    path: '',
    data: { [CRUMB]: 'homebrew.list.title' },
    providers: homebrewProviders(),
    children: [
      {
        path: '',
        loadComponent: loadWithMessages(async () => {
          const { PackListPage } = await import('./list/pack-list-page/pack-list-page.component');
          return PackListPage;
        }),
      },
      {
        path: ':id',
        // Opening a pack is the likely next step from the list.
        data: { ...PREFETCH_WHEN_IDLE, [CRUMB]: packCrumb },
        loadComponent: loadWithMessages(async () => {
          const { PackHomePage } = await import('./home/pack-home-page/pack-home-page.component');
          return PackHomePage;
        }),
      },
    ],
  },
];
