import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Stack } from '@pioneer/frontier';

import { SheetRuleBreaks } from '../sheet-rule-breaks/sheet-rule-breaks.component';
import { SheetSaveStatus } from '../sheet-save-status/sheet-save-status.component';

/** How the open character stands, for the sheet header: the items that break the table's rules, and how its edits stand. */
@Component({
  selector: 'pio-sheet-status',
  imports: [SheetRuleBreaks, SheetSaveStatus, Stack],
  templateUrl: './sheet-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetStatus {}
