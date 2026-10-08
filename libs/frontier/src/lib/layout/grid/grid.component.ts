import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

import { GAP, Space } from '../../tokens';

/**
 * Column count once the grid is wide enough. Columns respond to the grid's
 * own width (container queries), not the viewport: one column when narrow
 * (two for six-up stat blocks), more at the `md` and `lg` container sizes.
 */
export const GridColumns = { One: 1, Two: 2, Three: 3, Four: 4, Six: 6 } as const;
export type GridColumns = ValueOf<typeof GridColumns>;

/** Fluid alternative: as many columns as fit at this minimum item width. */
export const GridMinItem = { Sm: 'sm', Md: 'md', Lg: 'lg' } as const;
export type GridMinItem = ValueOf<typeof GridMinItem>;

const COLUMNS: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 @md:grid-cols-2',
  3: 'grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3',
  4: 'grid-cols-1 @md:grid-cols-2 @lg:grid-cols-4',
  6: 'grid-cols-2 @sm:grid-cols-3 @lg:grid-cols-6',
};
const MIN_ITEM: Record<GridMinItem, string> = {
  sm: 'grid-cols-[repeat(auto-fill,minmax(min(10rem,100%),1fr))]',
  md: 'grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))]',
  lg: 'grid-cols-[repeat(auto-fill,minmax(min(24rem,100%),1fr))]',
};

/**
 * Two-dimensional layout primitive. The host is the query container and an
 * inner element is the grid, because an element can't query its own size.
 * Fills its parent's width.
 */
@Component({
  selector: 'fr-grid',
  templateUrl: './grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: '@container block min-w-0' },
})
export class Grid {
  public readonly columns = input<GridColumns>(GridColumns.Two);
  public readonly minItem = input<GridMinItem | undefined>(undefined);
  public readonly gap = input<Space>(Space.Md);

  protected readonly classes = computed(() => {
    const minItem = this.minItem();
    return ['grid', minItem === undefined ? COLUMNS[this.columns()] : MIN_ITEM[minItem], GAP[this.gap()]].join(' ');
  });
}
