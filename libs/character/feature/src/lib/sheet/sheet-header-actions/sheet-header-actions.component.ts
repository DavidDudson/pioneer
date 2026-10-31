import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEllipsis } from '@lucide/angular';
import { Dropdown, Stack } from '@pioneer/frontier';

import { SheetActiveCount } from '../sheet-active-count/sheet-active-count.component';
import { SheetExport } from '../sheet-export/sheet-export.component';
import { SheetReportBug } from '../sheet-report-bug/sheet-report-bug.component';
import { SheetSaveStatus } from '../sheet-save-status/sheet-save-status.component';

/**
 * What the sheet header offers beside the identity line: how its edits stand, and a triple-dot menu holding the
 * sheet's actions (report a bug, export as JSON).
 */
@Component({
  selector: 'pio-sheet-header-actions',
  imports: [Dropdown, SheetActiveCount, SheetExport, SheetReportBug, SheetSaveStatus, Stack, TranslocoPipe],
  templateUrl: './sheet-header-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetHeaderActions {
  protected readonly menuIcon = LucideEllipsis;
}
