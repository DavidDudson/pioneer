import type { Routes } from '@angular/router';
import { signInRequired } from '@pioneer/identity/data-access';
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
        path: 'settings',
        // Preferences belong to an account; signed-out visitors get the defaults.
        canActivate: [signInRequired],
        // Signing out re-runs guards on the current page (SessionStore), so it is left at once.
        runGuardsAndResolvers: 'always',
        loadComponent: loadWithMessages(async () => {
          const { SettingsPage } = await import('./settings/settings-page.component');
          return SettingsPage;
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
