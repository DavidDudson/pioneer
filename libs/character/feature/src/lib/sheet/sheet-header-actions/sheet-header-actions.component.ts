import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, DRAWER_OPEN, DRAWER_PARAM, Stack } from '@pioneer/frontier';
import { ShellSearch } from '@pioneer/shared/web';

import { SheetActiveCount } from '../sheet-active-count/sheet-active-count.component';
import { SheetExport } from '../sheet-export/sheet-export.component';
import { SheetReportBug } from '../sheet-report-bug/sheet-report-bug.component';
import { SheetSidePanelState } from '../sheet-side-panel/sheet-side-panel-state';
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
  readonly #search = inject(ShellSearch);
  readonly #sidePanel = inject(SheetSidePanelState);
  /** Offered once the panel has loaded: before that, or if it never does, there is no drawer to open. */
  protected readonly hasSidePanel = computed(() => this.#sidePanel.panel() !== undefined);

  /** Opens the drawer, whose search takes the cursor as it opens, or as it is asked to when the drawer is open. */
  protected async openSidePanel(): Promise<void> {
    await this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { [DRAWER_PARAM]: DRAWER_OPEN },
      queryParamsHandling: 'merge',
    });
    this.#search.requestFocus();
  }
}
