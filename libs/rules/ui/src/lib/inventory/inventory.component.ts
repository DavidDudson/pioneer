import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { TemplateRef } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState, Heading, List, ListItem, Skeleton, Stack } from '@pioneer/frontier';

import type { InventoryGroup } from './inventory-line';
import { InventoryMessage, PLACEMENT_MESSAGES } from './inventory-messages';
import { InventoryRow } from './inventory-row/inventory-row.component';
import type { InventoryLineContext } from './inventory-row/inventory-row.component';

const LOADING_ROWS = 3;

/**
 * What a character carries, grouped worn, held and stowed, each item with how many and its Bulk and a container's
 * contents beneath it. Groups with nothing in them are left out.
 *
 * Presentational (ADR-0028): the caller groups the inventory, or passes undefined while it loads, and may pass
 * `actions`, a template shown beside every line with the line as its context, for the line's edits.
 *
 * ```html
 * <pio-inventory [groups]="groups()" [actions]="itemEdits" />
 * <ng-template #itemEdits let-line>…</ng-template>
 * ```
 */
@Component({
  selector: 'pio-inventory',
  imports: [EmptyState, Heading, InventoryRow, List, ListItem, Skeleton, Stack, TranslocoPipe],
  templateUrl: './inventory.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryView {
  /** The groups in order, worn first, or undefined while they load. */
  public readonly groups = input<readonly InventoryGroup[] | undefined>();
  public readonly actions = input<TemplateRef<InventoryLineContext> | undefined>(undefined);

  protected readonly Message = InventoryMessage;
  protected readonly placements = PLACEMENT_MESSAGES;
  protected readonly loadingRows = Array.from({ length: LOADING_ROWS }, (_unused, index) => index);
}
