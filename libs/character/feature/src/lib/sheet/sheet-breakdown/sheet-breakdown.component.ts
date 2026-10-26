import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Drawer } from '@pioneer/frontier';
import { BreakdownView } from '@pioneer/rules/ui';

import { SheetState } from '../sheet-state';
import { SheetBreakdownStatistic } from './sheet-breakdown-statistic';

/**
 * The breakdown of the statistic a stat link in a preview names, in a drawer beside the sheet. Nothing shows until a
 * link names a statistic the sheet derives. Its host takes no room, so the drawer lays out as a child of the page.
 */
@Component({
  selector: 'pio-sheet-breakdown',
  imports: [BreakdownView, Drawer],
  templateUrl: './sheet-breakdown.component.html',
  providers: [SheetBreakdownStatistic],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetBreakdown {
  protected readonly breakdown = inject(SheetBreakdownStatistic);
  protected readonly entryNames = inject(SheetState).picks.entryNames;
}
