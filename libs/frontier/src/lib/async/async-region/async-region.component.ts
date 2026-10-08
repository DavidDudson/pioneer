import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { Message } from '../../feedback/message/message.component';
import { AsyncData } from './async-data.directive';
import { AsyncError } from './async-error.directive';
import { AsyncPending } from './async-pending.directive';

/**
 * A region that loads its own data: the async version of a plain region.
 * Shows the pending template (skeletons) while the query loads, an inline
 * failure if it fails, and the data template once it has data. Other regions
 * and the page around it render at once.
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
  imports: [Message, NgTemplateOutlet, TranslocoPipe],
  templateUrl: './async-region.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[attr.aria-busy]': 'pending() || null' },
})
export class AsyncRegion<TData> {
  /** Defaults to a generic "Could not load" in the viewer's locale. */
  public readonly errorMessage = input<string | undefined>(undefined);

  protected readonly data = contentChild.required<AsyncData<TData>>(AsyncData);
  protected readonly pendingSlot = contentChild.required(AsyncPending);
  protected readonly errorSlot = contentChild(AsyncError);

  protected readonly pending = computed(() => this.data().query().isPending());
  protected readonly failed = computed(() => this.data().query().isError());
  protected readonly error = computed(() => this.data().query().error());
  protected readonly value = computed(() => this.data().query().data());
}
