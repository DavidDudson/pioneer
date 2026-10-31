import type { Routes } from '@angular/router';
import { SheetMode } from '@pioneer/character/domain';
import { CRUMB } from '@pioneer/frontier';
import { rollMessages } from '@pioneer/play/ui';
import { diceMessages } from '@pioneer/rules/dice';
import { engineMessages } from '@pioneer/rules/engine';
import { formulaMessages } from '@pioneer/rules/formula';
import { predicateMessages } from '@pioneer/rules/predicate';
import { rulesMessages } from '@pioneer/rules/sdk';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, PREFETCH_WHEN_IDLE, provideMessageScope } from '@pioneer/shared/web';

import { characterCrumb, sectionCrumb } from './crumbs';
import { CharacterGenerator } from './data/character-generator';
import { CharacterStore } from './data/character-store';
import { firstSectionPath } from './sheet/sheet-sections';

/**
 * Lazy routes for the character bounded context. The sheet renders engine output, so rules text from `rules/sdk`,
 * `rules/formula`, `rules/predicate` and `rules/engine` loads as their own `rules`, `formula`, `predicate` and
 * `engine` scopes; the roll card adds the `roll` and `dice` ones.
 */
export const characterRoutes: Routes = [
  {
    path: '',
    data: { [CRUMB]: 'character.list.title' },
    providers: [
      CharacterStore,
      CharacterGenerator,
      provideMessageScope('character', { [Locale.English]: async () => import('../i18n/en.json') }),
      provideMessageScope('roll', { [Locale.English]: async () => rollMessages.roll }),
      provideMessageScope('dice', { [Locale.English]: async () => diceMessages.dice }),
      provideMessageScope('rules', { [Locale.English]: async () => rulesMessages.rules }),
      provideMessageScope('formula', { [Locale.English]: async () => formulaMessages.formula }),
      provideMessageScope('predicate', { [Locale.English]: async () => predicateMessages.predicate }),
      provideMessageScope('engine', { [Locale.English]: async () => engineMessages.engine }),
    ],
    children: [
      {
        path: '',
        loadComponent: loadWithMessages(async () => {
          const { CharacterListPage } = await import('./list/character-list-page/character-list-page.component');
          return CharacterListPage;
        }),
      },
      {
        path: 'import/pathbuilder',
        data: { [CRUMB]: 'character.import.title' },
        loadComponent: loadWithMessages(async () => {
          const { PathbuilderImportPage } =
            await import('./import/pathbuilder-import-page/pathbuilder-import-page.component');
          return PathbuilderImportPage;
        }),
      },
      {
        path: 'import/pioneer',
        data: { [CRUMB]: 'character.import.pioneer.title' },
        loadComponent: loadWithMessages(async () => {
          const { PioneerImportPage } = await import('./import/pioneer-import-page/pioneer-import-page.component');
          return PioneerImportPage;
        }),
      },
      {
        path: ':id',
        // Opening a character is the likely next step from the list.
        data: { ...PREFETCH_WHEN_IDLE, [CRUMB]: characterCrumb },
        loadComponent: loadWithMessages(async () => {
          const { CharacterSheetPage } = await import('./sheet/character-sheet-page/character-sheet-page.component');
          return CharacterSheetPage;
        }),
        // One route per tab (play-and-campaigns.md, Sheet modes); the character's own address opens the last one.
        children: [
          {
            path: '',
            loadComponent: async () => {
              const { SheetModeRedirect } = await import('./sheet/sheet-mode-redirect/sheet-mode-redirect.component');
              return SheetModeRedirect;
            },
          },
          {
            path: SheetMode.Plan,
            data: { [CRUMB]: 'character.sheet.tabs.plan' },
            // Each section of the tab is a route of its own; the tab's address opens its first.
            children: [
              { path: '', pathMatch: 'full', redirectTo: firstSectionPath(SheetMode.Plan) },
              {
                path: ':section',
                data: { [CRUMB]: sectionCrumb },
                loadComponent: async () => {
                  const { SheetPlanTab } = await import('./sheet/sheet-plan-tab/sheet-plan-tab.component');
                  return SheetPlanTab;
                },
              },
            ],
          },
          {
            path: SheetMode.Encounter,
            data: { [CRUMB]: 'character.sheet.tabs.encounter' },
            // Each section of the tab is a route of its own; the tab's address opens its first.
            children: [
              { path: '', pathMatch: 'full', redirectTo: firstSectionPath(SheetMode.Encounter) },
              {
                path: ':section',
                data: { [CRUMB]: sectionCrumb },
                loadComponent: async () => {
                  const { SheetEncounterTab } =
                    await import('./sheet/sheet-encounter-tab/sheet-encounter-tab.component');
                  return SheetEncounterTab;
                },
              },
            ],
          },
          {
            path: SheetMode.Exploration,
            data: { [CRUMB]: 'character.sheet.tabs.exploration' },
            // Each section of the tab is a route of its own; the tab's address opens its first.
            children: [
              { path: '', pathMatch: 'full', redirectTo: firstSectionPath(SheetMode.Exploration) },
              {
                path: ':section',
                data: { [CRUMB]: sectionCrumb },
                loadComponent: async () => {
                  const { SheetExplorationTab } =
                    await import('./sheet/sheet-exploration-tab/sheet-exploration-tab.component');
                  return SheetExplorationTab;
                },
              },
            ],
          },
          {
            path: SheetMode.Downtime,
            data: { [CRUMB]: 'character.sheet.tabs.downtime' },
            // Each section of the tab is a route of its own; the tab's address opens its first.
            children: [
              { path: '', pathMatch: 'full', redirectTo: firstSectionPath(SheetMode.Downtime) },
              {
                path: ':section',
                data: { [CRUMB]: sectionCrumb },
                loadComponent: async () => {
                  const { SheetDowntimeTab } = await import('./sheet/sheet-downtime-tab/sheet-downtime-tab.component');
                  return SheetDowntimeTab;
                },
              },
            ],
          },
        ],
      },
    ],
  },
];
