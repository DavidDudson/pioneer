import type { EnvironmentProviders } from '@angular/core';
import type { Route } from '@angular/router';
import { SheetMode } from '@pioneer/character/domain';
import { CRUMB } from '@pioneer/frontier';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, PREFETCH_WHEN_IDLE, provideMessageScope } from '@pioneer/shared/web';

import { characterCrumb, sectionCrumb } from './crumbs';
import { firstSectionPath } from './sheet/sheet-sections';

/** The `character` message scope: the keys of this lib's `i18n/en.json`, shared with the flows that lazy-load it. */
export function provideCharacterMessages(): EnvironmentProviders {
  return provideMessageScope('character', { [Locale.English]: async () => import('../i18n/en.json') });
}

/** The sheet of one character, `:id` under the character routes; one child route per tab (play-and-campaigns.md). */
export const characterSheetRoute: Route = {
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
            const { SheetEncounterTab } = await import('./sheet/sheet-encounter-tab/sheet-encounter-tab.component');

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
};
