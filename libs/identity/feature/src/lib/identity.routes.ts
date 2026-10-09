import type { Routes } from '@angular/router';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, provideMessageScope } from '@pioneer/shared/web';

/** Lazy routes for account pages, mounted at `/account`. */
export const identityRoutes: Routes = [
  {
    path: '',
    providers: [provideMessageScope('identity', { [Locale.English]: async () => import('../i18n/en.json') })],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: loadWithMessages(async () => {
          const { AccountPage } = await import('./account/account-page.component');
          return AccountPage;
        }),
      },
      {
        path: 'sign-in',
        loadComponent: loadWithMessages(async () => {
          const { SignInPage } = await import('./sign-in/sign-in-page.component');
          return SignInPage;
        }),
      },
      {
        path: 'sign-in-failed',
        loadComponent: loadWithMessages(async () => {
          const { SignInFailedPage } = await import('./sign-in-failed/sign-in-failed-page.component');
          return SignInFailedPage;
        }),
      },
    ],
  },
];
