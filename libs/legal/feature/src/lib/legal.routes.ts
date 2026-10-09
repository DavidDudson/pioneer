import type { Routes } from '@angular/router';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, provideMessageScope } from '@pioneer/shared/web';

/** Lazy routes for the public Legal page (ADR-0007): no account, no guard. */
export const legalRoutes: Routes = [
  {
    path: '',
    providers: [provideMessageScope('legal', { [Locale.English]: async () => import('../i18n/en.json') })],
    loadComponent: loadWithMessages(async () => {
      const { LegalPage } = await import('./legal-page/legal-page.component');
      return LegalPage;
    }),
  },
];
