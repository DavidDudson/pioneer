import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Drawer } from '@pioneer/frontier';

import { HitPointsDrawerState } from './hit-points-drawer-state';
import { SheetHitPointControls } from './sheet-hit-point-controls.component';

/** The query parameter that opens the Hit Point controls. */
const HIT_POINTS_DRAWER_PARAM = 'hp';

/** The Hit Point controls in a drawer beside the sheet. Its host takes no room, so the drawer lays out as a child of the page. */
@Component({
  selector: 'pio-sheet-hit-points-drawer',
  imports: [Drawer, SheetHitPointControls, TranslocoPipe],
  templateUrl: './sheet-hit-points-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetHitPointsDrawer {
  protected readonly param = HIT_POINTS_DRAWER_PARAM;
  protected readonly state = inject(HitPointsDrawerState);
}
