import {
  afterRenderEffect,
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import type { Signal } from '@angular/core';
import type { VirtualItem } from '@tanstack/angular-virtual';

import { injectOptionVirtualizer } from './option-virtualizer';

/**
 * Virtual rows for a listbox or grid body, on its own scroll container: `[frVirtualRows]="keys"` with the rows
 * `rows()` says to render, each marked `[frVirtualRow]`, and a body as tall as `totalSize()`.
 *
 * The first and last rows, the highlighted row and its neighbours, and the picked row always render. Arrow keys
 * reach the real next row even before the container has scrolled, and Home and End reach the real ends. The
 * highlight is kept in view, and the list starts from the top again when `resetOn` changes.
 *
 * ```html
 * <div [frVirtualRows]="keys()" #virtual="frVirtualRows" [activeIndex]="active()" [resetOn]="rows()">
 *   <div [style.height.px]="virtual.totalSize()">
 *     @for (row of virtual.rows(); track row.key) { <div [frVirtualRow]="row">…</div> }
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[frVirtualRows]',
  host: { '(scroll)': 'scrolled()' },
  exportAs: 'frVirtualRows',
})
export class VirtualRows {
  /** A stable key per row, in order. */
  public readonly keys = input.required<readonly string[]>({ alias: 'frVirtualRows' });
  /** The row holding the keyboard's highlight. */
  public readonly activeIndex = input<number | undefined>(undefined);
  /** The picked row. */
  public readonly pickedIndex = input<number | undefined>(undefined);
  /** Changes whenever the rows start over (new matches, a new order): the list scrolls back to the top. */
  public readonly resetOn = input<unknown>(undefined);
  /** The rows are loading: none render and the body has no height, so a skeleton can take their place. */
  public readonly suspended = input(false, { transform: booleanAttribute });

  /** Counts the container's scroll events. */
  readonly #scrolls = signal(0);
  readonly #virtualizer = injectOptionVirtualizer({
    keys: this.keys,
    scroller: inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
    pinned: computed(() => {
      const active = this.activeIndex();
      // The highlight's neighbours too, so an arrow key always lands on the next row, even before the list scrolls.
      const around = active === undefined ? [] : [active - 1, active, active + 1];

      return [...around, this.pickedIndex()];
    }),
  });

  /** The rows to render now. */
  public readonly rows: Signal<readonly VirtualItem[]> = computed(() =>
    this.suspended() ? [] : this.#virtualizer.getVirtualItems(),
  );
  /** The height of the body the rows are placed in. */
  public readonly totalSize: Signal<number> = computed(() => (this.suspended() ? 0 : this.#virtualizer.getTotalSize()));

  public constructor() {
    // Arrow keys move the highlight; keep it in view inside the container, never scrolling the page.
    afterRenderEffect(() => {
      const index = this.activeIndex();

      if (index !== undefined) {
        untracked(() => {
          this.#virtualizer.scrollToIndex(index, { align: 'auto' });
        });
      }
    });
    afterRenderEffect(() => {
      this.resetOn();
      untracked(() => {
        this.#virtualizer.scrollToOffset(0);
      });
    });
  }

  /**
   * The last row in view. An effect that reads it runs again on every scroll event, even one that leaves the same row
   * last, which is how a list asks again for more after a load that added none.
   */
  public lastShown(): number | undefined {
    this.#scrolls();

    return this.#virtualizer.range()?.endIndex;
  }

  protected scrolled(): void {
    this.#scrolls.update((count) => count + 1);
  }

  /** Measures a rendered row, so rows of any height stack without gaps. */
  public measure(element: HTMLElement): void {
    this.#virtualizer.measureElement(element);
  }
}
