import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Disclosure, DisclosureVariant, Rail, Stack, Text } from '@pioneer/frontier';

import { SheetPanelContent } from '../sheet-panel/sheet-panel.component';
import { SheetResources } from '../sheet-resources/sheet-resources.component';
import { SHEET_PANELS } from '../sheet-sections';

/**
 * The sheet's side panels, in a rail that stays in view beside every mode from `lg`: the hero points, then the Skills,
 * Conditions and Environments panels, each of which folds away. Narrower there is no rail: the panels are entries of
 * the section dropdown (`pio-sheet-section-tabs`).
 */
@Component({
  selector: 'pio-sheet-panels',
  imports: [Disclosure, Rail, SheetPanelContent, SheetResources, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-panels.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPanels {
  protected readonly panels = SHEET_PANELS;
  protected readonly bordered = DisclosureVariant.Bordered;
}
