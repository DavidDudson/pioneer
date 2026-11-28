import { Directive, inject, TemplateRef } from '@angular/core';

export interface AsyncItemContext<TItem> {
  readonly $implicit: TItem;
  readonly index: number;
}

/**
 * The row of an `fr-async-list`, built once per item of the query's data. Put an `fr-list-item` in it; `let-x` is the
 * item, typed by the list's query.
 *
 * ```html
 * <ng-template frAsyncItem let-feat><fr-list-item>{{ feat.name }}</fr-list-item></ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[frAsyncItem]' })
export class AsyncItem<TItem> {
  public readonly template = inject<TemplateRef<AsyncItemContext<TItem>>>(TemplateRef);

  public static ngTemplateContextGuard<TItem>(
    _directive: AsyncItem<TItem>,
    context: unknown,
  ): context is AsyncItemContext<TItem> {
    return context !== undefined;
  }
}
