import type { Routes } from '@angular/router';
import { rulesMessages } from '@pioneer/rules/sdk';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, provideMessageScope } from '@pioneer/shared/web';

/** Lazy routes for the public content browser (ADR-0007): no account, no guard. */
export const contentRoutes: Routes = [
  {
    path: '',
    providers: [
      provideMessageScope('content', { [Locale.English]: async () => import('../i18n/en.json') }),
      // Facet labels and their values.
      provideMessageScope('rules', { [Locale.English]: async () => rulesMessages.rules }),
    ],
    loadComponent: loadWithMessages(async () => {
      const { ContentBrowserPage } = await import('./browser/content-browser-page.component');
      return ContentBrowserPage;
    }),
  },
];
