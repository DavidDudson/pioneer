import { Directive, inject, input, TemplateRef } from '@angular/core';

import type { AsyncQuery } from './async-query';

export interface AsyncDataContext<TData> {
  readonly $implicit: TData;
}

/**
 * The loaded content of an `fr-async-region`, and the query it comes from.
 * `let-x` is the query's data, typed.
 *
 * ```html
 * <ng-template [frAsyncData]="store.list" let-characters>…</ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[frAsyncData]' })
export class AsyncData<TData> {
  public readonly query = input.required<AsyncQuery<TData>>({ alias: 'frAsyncData' });
  public readonly template = inject<TemplateRef<AsyncDataContext<TData>>>(TemplateRef);

  public static ngTemplateContextGuard<TData>(
    _directive: AsyncData<TData>,
    context: unknown,
  ): context is AsyncDataContext<TData> {
    return context !== undefined;
  }
}
