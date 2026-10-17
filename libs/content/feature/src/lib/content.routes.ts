import type { Routes } from '@angular/router';
import { CRUMB } from '@pioneer/frontier';
import { rulesMessages } from '@pioneer/rules/sdk';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, provideMessageScope } from '@pioneer/shared/web';

import { KIND_PARAM } from './browser/browse-kinds';
import { entryCrumb, kindCrumb } from './crumbs';

/** Lazy routes for the public content browser (ADR-0007): no account, no guard. */
export const contentRoutes: Routes = [
  {
    path: '',
    data: { [CRUMB]: 'content.crumb.browser' },
    providers: [
      provideMessageScope('content', { [Locale.English]: async () => import('../i18n/en.json') }),
      // Facet labels and their values.
      provideMessageScope('rules', { [Locale.English]: async () => rulesMessages.rules }),
    ],
    children: [
      {
        path: '',
        loadComponent: loadWithMessages(async () => {
          const { ContentBrowserPage } = await import('./browser/content-browser-page.component');
          return ContentBrowserPage;
        }),
      },
      {
        // An entry's URL is its kind and the name part of its slug: /content/feat/power-attack. The kind opens the browser on it.
        path: ':kind',
        data: { [CRUMB]: kindCrumb },
        children: [
          { path: '', pathMatch: 'full', redirectTo: ({ params }) => `/content?${KIND_PARAM}=${params['kind'] ?? ''}` },
          {
            path: ':slug',
            data: { [CRUMB]: entryCrumb },
            loadComponent: loadWithMessages(async () => {
              const { EntryPage } = await import('./entry/entry-page.component');
              return EntryPage;
            }),
          },
        ],
      },
    ],
  },
];
