import { afterRenderEffect, computed, Directive, ElementRef, inject, input } from '@angular/core';
import type { VirtualItem } from '@tanstack/angular-virtual';

import { VirtualRows } from './virtual-rows.directive';

/**
 * One row of a `[frVirtualRows]` container: placed where the virtualizer says and measured once it renders. Put it
 * on the row's own element, or on a component's host.
 */
@Directive({
  selector: '[frVirtualRow]',
  host: { '[style.transform]': 'offset()', '[attr.data-index]': 'row().index' },
})
export class VirtualRow {
  public readonly row = input.required<VirtualItem>({ alias: 'frVirtualRow' });

  /** The row's offset inside the container. */
  protected readonly offset = computed(() => `translateY(${this.row().start}px)`);

  readonly #rows = inject(VirtualRows);
  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  public constructor() {
    afterRenderEffect(() => {
      // `data-index` is what the virtualizer reads to tell which row a measured element is: measure again if it moves.
      this.row();
      this.#rows.measure(this.#element);
    });
  }
}
