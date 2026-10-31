import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Disclosure,
  DisclosureVariant,
  Rail,
  Stack,
  Text,
} from '@pioneer/frontier';
import { ENTRY_PREVIEWS, SkillsView } from '@pioneer/rules/ui';
import type { EntryPreviews } from '@pioneer/rules/ui';

import { SheetConditions } from '../sheet-conditions/sheet-conditions.component';
import { SheetEnvironments } from '../sheet-environments/sheet-environments.component';
import { SheetResources } from '../sheet-resources/sheet-resources.component';
import { SHEET_SECTIONS } from '../sheet-sections';
import { SheetState } from '../sheet-state';

/**
 * The sheet's side panels, in a rail that stays in view beside every mode: the hero points, then the Skills,
 * Conditions and Environments panels, each of which folds away. Below `lg` the rail stacks above the tab.
 */
@Component({
  selector: 'pio-sheet-panels',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Disclosure,
    Rail,
    SheetConditions,
    SheetEnvironments,
    SheetResources,
    SkillsView,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './sheet-panels.component.html',
  providers: [{ provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(SheetState).previews }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPanels {
  protected readonly sheet = inject(SheetState);
  protected readonly picks = this.sheet.picks;
  protected readonly sections = SHEET_SECTIONS;
  protected readonly bordered = DisclosureVariant.Bordered;
}
