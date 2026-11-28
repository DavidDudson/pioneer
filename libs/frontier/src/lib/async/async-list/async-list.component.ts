import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  numberAttribute,
  output,
} from '@angular/core';

import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { ListItem } from '../../list/list-item/list-item.component';
import { List } from '../../list/list/list.component';
import { AsyncEmpty } from '../async-region/async-empty.directive';
import { AsyncError } from '../async-region/async-error.directive';
import { AsyncFilteredEmpty } from '../async-region/async-filtered-empty.directive';
import type { AsyncQuery } from '../async-region/async-query';
import { AsyncView } from '../async-region/async-view.component';
import { AsyncItem } from './async-item.directive';

const DEFAULT_SKELETON_ROWS = 3;

/**
 * A list that loads its own items: the async version of `fr-list`. While the query loads it shows skeleton rows
 * shaped like an item (`kind="item"`), `skeletonRows` of them; when it fails, the failure inline; when it loads with
 * nothing, the empty state (`frAsyncEmpty`, or a default), or the filtered-empty state when `filtered` is set
 * (`frAsyncFilteredEmpty`, or a default with a Clear button that emits `cleared`).
 *
 * ```html
 * <fr-async-list [query]="feats" [filtered]="search() !== ''" (cleared)="clear()">
 *   <ng-template frAsyncItem let-feat>
 *     <fr-list-item>{{ feat.name }}</fr-list-item>
 *   </ng-template>
 * </fr-async-list>
 * ```
 */
@Component({
  selector: 'fr-async-list',
  imports: [AsyncView, List, ListItem, NgTemplateOutlet, Skeleton],
  templateUrl: './async-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[attr.aria-busy]': 'pending() || null' },
})
export class AsyncList<TItem> {
  public readonly query = input.required<AsyncQuery<ReadonlyArray<TItem>>>();
  /** A filter or search is narrowing the list, so nothing to show is the filtered-empty state. */
  public readonly filtered = input(false, { transform: booleanAttribute });
  /** How many skeleton rows stand in for the items while loading. */
  public readonly skeletonRows = input(DEFAULT_SKELETON_ROWS, { transform: numberAttribute });
  /** Defaults to a generic "Could not load" in the viewer's locale. */
  public readonly errorMessage = input<string | undefined>(undefined);
  /** The filtered-empty state's Clear button was pressed. */
  public readonly cleared = output();

  protected readonly item = contentChild.required<AsyncItem<TItem>>(AsyncItem);
  protected readonly errorSlot = contentChild(AsyncError);
  protected readonly emptySlot = contentChild(AsyncEmpty);
  protected readonly filteredEmptySlot = contentChild(AsyncFilteredEmpty);

  protected readonly pending = computed(() => this.query().isPending());
  protected readonly rows = computed(() => Array.from({ length: this.skeletonRows() }, (_unused, row) => row));
}
