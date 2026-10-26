import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Drawer } from '@pioneer/frontier';

import { SheetBreakdown } from '../sheet-breakdown/sheet-breakdown.component';
import { SheetSidePanelHost } from '../sheet-side-panel/sheet-side-panel.component';

/**
 * The drawers docked beside the sheet: the content search, and the breakdown a stat link opens. Project it into
 * `fr-page` as a drawer (`ngProjectAs="fr-drawer"`); its host takes no room, so each drawer lays out as the page's own.
 */
@Component({
  selector: 'pio-sheet-drawers',
  imports: [Drawer, SheetBreakdown, SheetSidePanelHost, TranslocoPipe],
  templateUrl: './sheet-drawers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetDrawers {}
