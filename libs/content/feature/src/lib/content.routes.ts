import type { Routes } from '@angular/router';
import { contentBrowserMessages } from '@pioneer/content/ui';
import { rulesMessages } from '@pioneer/rules/sdk';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, provideMessageScope } from '@pioneer/shared/web';

/** Lazy routes for the public content browser (ADR-0007): no account, no guard. */
export const contentRoutes: Routes = [
  {
    path: '',
    providers: [
      provideMessageScope('content', { [Locale.English]: async () => import('../i18n/en.json') }),
      // The browser's own text: its search, list and entry.
      provideMessageScope('contentBrowser', { [Locale.English]: async () => contentBrowserMessages.contentBrowser }),
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
        // An entry's URL is its kind and the name part of its slug: /content/feat/power-attack.
        path: ':kind/:slug',
        loadComponent: loadWithMessages(async () => {
          const { EntryPage } = await import('./entry/entry-page.component');
          return EntryPage;
        }),
      },
    ],
  },
];
