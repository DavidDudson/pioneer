import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Stack } from '@pioneer/frontier';

import { SheetExport } from '../sheet-export/sheet-export.component';
import { SheetReportBug } from '../sheet-report-bug/sheet-report-bug.component';
import { SheetStatus } from '../sheet-status/sheet-status.component';

/** What the sheet header offers beside the identity line: how the character stands, report a bug, export. */
@Component({
  selector: 'pio-sheet-header-actions',
  imports: [SheetExport, SheetReportBug, SheetStatus, Stack],
  templateUrl: './sheet-header-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetHeaderActions {}
