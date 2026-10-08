import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { injectWindowVirtualizer } from '@tanstack/angular-virtual';
import type { VirtualItem as VirtualRow } from '@tanstack/angular-virtual';
import { cva } from 'class-variance-authority';

import { Space } from '../../tokens';
import { VirtualItem } from './virtual-item.directive';

/** Rough row height before rows are measured. Rows are measured once rendered. */
export const VirtualEstimate = { Sm: 'sm', Md: 'md', Lg: 'lg' } as const;
export type VirtualEstimate = ValueOf<typeof VirtualEstimate>;

/** Initial guesses in CSS pixels; the virtualizer replaces them with measurements. */
const ESTIMATE_PX: Record<VirtualEstimate, number> = { sm: 48, md: 96, lg: 160 };
const OVERSCAN = 4;

const listClasses = cva('relative block w-full')();
const rowVariants = cva('absolute top-none left-none block w-full', {
  variants: {
    gap: {
      none: 'pb-none',
      '3xs': 'pb-3xs',
      '2xs': 'pb-2xs',
      xs: 'pb-xs',
      sm: 'pb-sm',
      md: 'pb-md',
      lg: 'pb-lg',
      xl: 'pb-xl',
      '2xl': 'pb-2xl',
      '3xl': 'pb-3xl',
    } satisfies Record<Space, string>,
  },
});

/**
 * A long list that only renders the rows on screen (TanStack Virtual). The
 * page scrolls, not the list, so it behaves like any other content on a
 * phone. Rows can be any height; they are measured as they render.
 *
 * ```html
 * <fr-virtual-list gap="md" estimate="md">
 *   <ng-template [frVirtualItem]="characters" let-character>…</ng-template>
 * </fr-virtual-list>
 * ```
 */
@Component({
  selector: 'fr-virtual-list',
  imports: [NgTemplateOutlet],
  templateUrl: './virtual-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full', role: 'list' },
})
export class VirtualList<TItem> {
  public readonly gap = input<Space>(Space.Md);
  public readonly estimate = input<VirtualEstimate>(VirtualEstimate.Md);
  /** Stable identity per item, so rows keep their measurements when the list changes. */
  public readonly itemKey = input<((item: TItem, index: number) => string) | undefined>(undefined);

  protected readonly slot = contentChild.required<VirtualItem<TItem>>(VirtualItem);
  protected readonly items = computed(() => this.slot().items());
  protected readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  protected readonly rows = viewChildren<ElementRef<HTMLElement>>('row');

  /** Distance from the top of the document to the list, so window scroll maps to rows. */
  readonly #offset = signal(0);

  protected readonly virtualizer = injectWindowVirtualizer<HTMLElement>(() => {
    const items = this.items();
    const itemKey = this.itemKey();
    return {
      count: items.length,
      estimateSize: (): number => ESTIMATE_PX[this.estimate()],
      overscan: OVERSCAN,
      scrollMargin: this.#offset(),
      ...(itemKey === undefined
        ? {}
        : {
            getItemKey: (index: number): string | number => {
              const item = items[index];
              return item === undefined ? index : itemKey(item, index);
            },
          }),
    };
  });

  protected readonly virtualRows = computed(() => this.virtualizer.getVirtualItems());
  protected readonly totalSize = computed(() => this.virtualizer.getTotalSize());
  protected readonly listClasses = listClasses;
  protected readonly rowClasses = computed(() => rowVariants({ gap: this.gap() }));

  public constructor() {
    afterNextRender(() => {
      this.#offset.set(this.list().nativeElement.getBoundingClientRect().top + window.scrollY);
    });
    afterRenderEffect(() => {
      for (const row of this.rows()) {
        this.virtualizer.measureElement(row.nativeElement);
      }
    });
  }

  protected translate(row: VirtualRow): string {
    return `translateY(${row.start - this.virtualizer.options().scrollMargin}px)`;
  }
}
