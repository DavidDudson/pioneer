import { Directive, inject, input, TemplateRef } from '@angular/core';

export interface VirtualItemContext<TItem> {
  readonly $implicit: TItem;
  readonly index: number;
}

/**
 * One row of an `fr-virtual-list`, and the items it renders. `let-item` is
 * typed from the items.
 *
 * ```html
 * <ng-template [frVirtualItem]="characters" let-character>…</ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[frVirtualItem]' })
export class VirtualItem<TItem> {
  public readonly items = input.required<readonly TItem[]>({ alias: 'frVirtualItem' });
  public readonly template = inject<TemplateRef<VirtualItemContext<TItem>>>(TemplateRef);

  public static ngTemplateContextGuard<TItem>(
    _directive: VirtualItem<TItem>,
    context: unknown,
  ): context is VirtualItemContext<TItem> {
    return context !== undefined;
  }
}
