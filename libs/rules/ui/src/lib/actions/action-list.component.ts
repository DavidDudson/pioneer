import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmptyState, List, ListItem, Skeleton } from '@pioneer/frontier';

import { ActionRow } from './action-row.component';
import type { ShownAction } from './action-row.component';

/** Rows of placeholders while the actions load. */
const LOADING_ROWS = 3;

/**
 * Actions in a list, each a `pio-action-row`: placeholder rows while they load (undefined), and a message when there
 * are none.
 */
@Component({
  selector: 'pio-action-list',
  imports: [ActionRow, EmptyState, List, ListItem, Skeleton],
  templateUrl: './action-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionList {
  /** Undefined while loading. */
  public readonly rows = input.required<readonly ShownAction[] | undefined>();
  /** What to say when there are no rows, already translated. */
  public readonly empty = input.required<string>();
  /** Whether each row shows its status, which the All view needs and the Now view does not. */
  public readonly showStatus = input(false);

  protected readonly loadingRows = [...Array.from({ length: LOADING_ROWS }).keys()];
}
