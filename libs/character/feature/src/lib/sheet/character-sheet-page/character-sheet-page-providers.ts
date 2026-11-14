import { inject } from '@angular/core';
import { STATISTIC_NAMES } from '@pioneer/rules/ui';
import type { StatisticNamer } from '@pioneer/rules/ui';

import { CHARACTER_CONTENT_PROVIDERS } from '../../data/source-packs';
import { SheetConfigurationState } from '../sheet-configuration/sheet-configuration-state';
import { SHEET_INLINE_ROLLS_PROVIDERS } from '../sheet-inline-rolls';
import { SHEET_OVERRIDES_PROVIDERS } from '../sheet-override/sheet-override';
import { SHEET_ROLLS_PROVIDERS } from '../sheet-rolls';
import { SheetSidePanelState } from '../sheet-side-panel/sheet-side-panel-state';
import { SHEET_PLAY_PROVIDERS } from '../sheet-spender';
import { SheetState } from '../sheet-state';

/** What a breakdown calls the statistics its references read: the definition's name in the registry the engine reads. */
function statisticNames(): StatisticNamer {
  const sheet = inject(SheetState);
  return (selector): string | undefined => sheet.engine()?.statisticsFor(selector).at(-1)?.definition.name;
}

/** What the sheet page provides to every region below it. */
export const CHARACTER_SHEET_PAGE_PROVIDERS = [
  SheetConfigurationState,
  SheetSidePanelState,
  SheetState,
  { provide: STATISTIC_NAMES, useFactory: statisticNames },
  ...SHEET_PLAY_PROVIDERS,
  ...CHARACTER_CONTENT_PROVIDERS,
  ...SHEET_ROLLS_PROVIDERS,
  ...SHEET_INLINE_ROLLS_PROVIDERS,
  ...SHEET_OVERRIDES_PROVIDERS,
];
