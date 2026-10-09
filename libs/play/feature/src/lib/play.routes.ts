import type { Routes } from '@angular/router';
import { diceMessages } from '@pioneer/rules/dice';
import { engineMessages } from '@pioneer/rules/engine';
import { formulaMessages } from '@pioneer/rules/formula';
import { grantsMessages } from '@pioneer/rules/grants';
import { predicateMessages } from '@pioneer/rules/predicate';
import { rulesMessages } from '@pioneer/rules/sdk';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, provideMessageScope } from '@pioneer/shared/web';

/**
 * Lazy routes for solo play and the rules playground. Rules text from `rules/dice`, `rules/sdk`,
 * `rules/formula`, `rules/predicate`, `rules/engine` and `rules/grants` loads as their own `dice`, `rules`,
 * `formula`, `predicate`, `engine` and `grants` scopes.
 */
export const playRoutes: Routes = [
  {
    path: '',
    providers: [
      provideMessageScope('play', { [Locale.English]: async () => import('../i18n/en.json') }),
      provideMessageScope('dice', { [Locale.English]: async () => diceMessages.dice }),
      provideMessageScope('rules', { [Locale.English]: async () => rulesMessages.rules }),
      provideMessageScope('formula', { [Locale.English]: async () => formulaMessages.formula }),
      provideMessageScope('predicate', { [Locale.English]: async () => predicateMessages.predicate }),
      provideMessageScope('engine', { [Locale.English]: async () => engineMessages.engine }),
      provideMessageScope('grants', { [Locale.English]: async () => grantsMessages.grants }),
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
