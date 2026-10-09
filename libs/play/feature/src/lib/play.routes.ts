import type { Routes } from '@angular/router';
import { diceMessages } from '@pioneer/rules/dice';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, provideMessageScope } from '@pioneer/shared/web';

/** Lazy routes for solo play. Rules text from `rules/dice` loads as its own `dice` scope. */
export const playRoutes: Routes = [
  {
    path: '',
    providers: [
      provideMessageScope('play', { [Locale.English]: async () => import('../i18n/en.json') }),
      provideMessageScope('dice', { [Locale.English]: async () => diceMessages.dice }),
    ],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dice' },
      {
        path: 'dice',
        loadComponent: loadWithMessages(async () => {
          const { DicePlaygroundPage } = await import('./dice/dice-playground-page/dice-playground-page.component');
          return DicePlaygroundPage;
        }),
      },
    ],
  },
];
