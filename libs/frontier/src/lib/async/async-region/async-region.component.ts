import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  output,
} from '@angular/core';

import { AsyncData } from './async-data.directive';
import { AsyncEmpty } from './async-empty.directive';
import { AsyncError } from './async-error.directive';
import { AsyncFilteredEmpty } from './async-filtered-empty.directive';
import { AsyncPending } from './async-pending.directive';
import { AsyncView } from './async-view.component';

/**
 * A region that loads its own data: the async version of a plain region.
 * Shows the pending template (skeletons) while the query loads, an inline
 * failure if it fails, and the data template once it has data. Other regions
 * and the page around it render at once. A failed next page of an infinite
 * query keeps the data: `fr-load-more` shows that failure under its button.
 *
 * Give it a `frAsyncEmpty` or `frAsyncFilteredEmpty` template and loaded data with nothing in it shows that instead
 * of the data template; `filtered` says a filter is active, and the default Clear button emits `cleared`.
 *
 * ```html
 * <fr-async-region errorMessage="Could not load characters.">
 *   <ng-template frAsyncPending><fr-skeleton width="lg" /></ng-template>
 *   <ng-template [frAsyncData]="store.list" let-characters>…</ng-template>
 * </fr-async-region>
 * ```
 */
@Component({
  selector: 'fr-async-region',
  imports: [AsyncView],
  templateUrl: './async-region.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[attr.aria-busy]': 'pending() || null' },
})
export class AsyncRegion<TData> {
  /** Defaults to a generic "Could not load" in the viewer's locale. */
  public readonly errorMessage = input<string | undefined>(undefined);
  /** A filter or search is narrowing the data, so nothing to show is the filtered-empty state. */
  public readonly filtered = input(false, { transform: booleanAttribute });
  /** The filtered-empty state's Clear button was pressed. */
  public readonly cleared = output();

  protected readonly data = contentChild.required<AsyncData<TData>>(AsyncData);
  protected readonly pendingSlot = contentChild.required(AsyncPending);
  protected readonly errorSlot = contentChild(AsyncError);
  protected readonly emptySlot = contentChild(AsyncEmpty);
  protected readonly filteredEmptySlot = contentChild(AsyncFilteredEmpty);

  protected readonly pending = computed(() => this.data().query().isPending());
  protected readonly detectEmpty = computed(
    () => this.emptySlot() !== undefined || this.filteredEmptySlot() !== undefined,
  );
}
