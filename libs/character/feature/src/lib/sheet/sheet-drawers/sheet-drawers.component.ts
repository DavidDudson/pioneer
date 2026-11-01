import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Drawer } from '@pioneer/frontier';

import { SheetBreakdown } from '../sheet-breakdown/sheet-breakdown.component';
import { SheetConfigurationDrawer } from '../sheet-configuration/sheet-configuration-drawer.component';
import { SheetOverrideDrawer } from '../sheet-override/sheet-override-drawer.component';
import { SheetSidePanelState } from '../sheet-side-panel/sheet-side-panel-state';

/**
 * The drawers docked beside the sheet: the content search once it has loaded, the breakdown a stat link opens, the override form, and the character's configuration. Project it into
 * `fr-page` as a drawer (`ngProjectAs="fr-drawer"`); its host takes no room, so each drawer lays out as the page's own.
 */
@Component({
  selector: 'pio-sheet-drawers',
  imports: [Drawer, NgComponentOutlet, SheetBreakdown, SheetConfigurationDrawer, SheetOverrideDrawer, TranslocoPipe],
  templateUrl: './sheet-drawers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetDrawers {
  protected readonly sidePanel = inject(SheetSidePanelState);
}
