import type { Routes } from '@angular/router';
import { diceMessages } from '@pioneer/rules/dice';
import { formulaMessages } from '@pioneer/rules/formula';
import { rulesMessages } from '@pioneer/rules/sdk';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, provideMessageScope } from '@pioneer/shared/web';

/**
 * Lazy routes for solo play and the rules playground. Rules text from `rules/dice`, `rules/sdk`
 * and `rules/formula` loads as their own `dice`, `rules` and `formula` scopes.
 */
export const playRoutes: Routes = [
  {
    path: '',
    providers: [
      provideMessageScope('play', { [Locale.English]: async () => import('../i18n/en.json') }),
      provideMessageScope('dice', { [Locale.English]: async () => diceMessages.dice }),
      provideMessageScope('rules', { [Locale.English]: async () => rulesMessages.rules }),
      provideMessageScope('formula', { [Locale.English]: async () => formulaMessages.formula }),
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
      {
        path: 'rules',
        loadComponent: loadWithMessages(async () => {
          const { RulesPlaygroundPage } = await import('./rules/rules-playground-page/rules-playground-page.component');
          return RulesPlaygroundPage;
        }),
      },
    ],
  },
];
