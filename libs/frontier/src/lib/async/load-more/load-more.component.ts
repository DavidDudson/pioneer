import { NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AsyncButton } from '../../actions/async-button/async-button.component';
import { Stack } from '../../layout/stack/stack.component';
import { Space } from '../../tokens';
import { AsyncPending } from '../async-region/async-pending.directive';
import { LoadMoreItem } from './load-more-item.directive';
import type { LoadMoreQuery } from './load-more-query';

/**
 * A long list that loads its next page in place. Projects the list, shows the
 * pending template (skeleton rows shaped like items) after it while the next
 * page loads, and a load-more `fr-async-button` while there are more pages: a
 * spinner while loading, a failure inline under the button. Once a page
 * lands, focus moves to its first item (`frLoadMoreItem`).
 *
 * The query is an `injectInfiniteQuery(...)` result; the feature flattens its
 * pages into the list.
 *
 * ```html
 * <fr-load-more [query]="spells">
 *   <ng-template frAsyncPending><fr-skeleton width="lg" /></ng-template>
 *   <fr-list>
 *     @for (spell of spellList(); track spell.id) {
 *       <fr-list-item frLoadMoreItem>…</fr-list-item>
 *     }
 *   </fr-list>
 * </fr-load-more>
 * ```
 */
@Component({
  selector: 'fr-load-more',
  imports: [AsyncButton, NgTemplateOutlet, Stack, TranslocoPipe],
  templateUrl: './load-more.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[attr.aria-busy]': 'loading() || null' },
})
export class LoadMore {
  public readonly query = input.required<LoadMoreQuery>();
  /** Space between the list, the pending rows and the button. */
  public readonly gap = input<Space>(Space.Md);
  /** Defaults to "Load more" in the viewer's locale. */
  public readonly label = input<string | undefined>(undefined);
  /** Defaults to a generic "Could not load more" in the viewer's locale. */
  public readonly errorMessage = input<string | undefined>(undefined);

  protected readonly pendingSlot = contentChild.required(AsyncPending, { descendants: false });
  protected readonly items = contentChildren(LoadMoreItem, { descendants: true });
  readonly #i18n = inject(TranslocoService);
  /** The index of the first item of a page that just landed, until focus moves there. */
  readonly #focusFrom = signal<number | undefined>(undefined);

  protected readonly loading = computed(() => this.query().isFetchingNextPage());
  protected readonly more = computed(() => this.query().hasNextPage());

  protected readonly loadMore = async (): Promise<void> => {
    const before = this.items().length;
    const page = await this.query().fetchNextPage();
    if (page.isError) {
      throw page.error;
    }
    this.#focusFrom.set(before);
  };

  protected readonly describeError = (): string =>
    this.errorMessage() ?? this.#i18n.translate('frontier.loadMore.failed');

  public constructor() {
    afterRenderEffect(() => {
      const from = this.#focusFrom();
      if (from === undefined) {
        return;
      }
      this.#focusFrom.set(undefined);
      this.items()[from]?.focus();
    });
  }
}
