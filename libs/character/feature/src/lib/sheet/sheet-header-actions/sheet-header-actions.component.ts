import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, DRAWER_OPEN, DRAWER_PARAM, Stack } from '@pioneer/frontier';

import { SHEET_SIDE_PANEL } from '../../data/sheet-side-panel';
import { SheetActiveCount } from '../sheet-active-count/sheet-active-count.component';
import { SheetExport } from '../sheet-export/sheet-export.component';
import { SheetReportBug } from '../sheet-report-bug/sheet-report-bug.component';
import { SheetStatus } from '../sheet-status/sheet-status.component';

/**
 * What the sheet header offers beside the identity line: how the character stands, report a bug, export, and the
 * content search in the side panel when the app provides one.
 */
@Component({
  selector: 'pio-sheet-header-actions',
  imports: [Button, SheetActiveCount, SheetExport, SheetReportBug, SheetStatus, Stack, TranslocoPipe],
  templateUrl: './sheet-header-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetHeaderActions {
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  protected readonly hasSidePanel = inject(SHEET_SIDE_PANEL) !== undefined;

  /** Opens the drawer, whose search takes the cursor as it opens. */
  protected async openSidePanel(): Promise<void> {
    await this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { [DRAWER_PARAM]: DRAWER_OPEN },
      queryParamsHandling: 'merge',
    });
  }
}
