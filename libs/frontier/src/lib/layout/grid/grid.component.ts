import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { gapVariants, Space } from '../../tokens';

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

const gridVariants = cva('grid', {
  variants: {
    columns: {
      1: 'grid-cols-1',
      2: 'grid-cols-1 @md:grid-cols-2',
      3: 'grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3',
      4: 'grid-cols-1 @md:grid-cols-2 @lg:grid-cols-4',
      6: 'grid-cols-2 @sm:grid-cols-3 @lg:grid-cols-6',
    } satisfies Record<GridColumns, string>,
    minItem: {
      sm: 'grid-cols-fill-sm',
      md: 'grid-cols-fill-md',
      lg: 'grid-cols-fill-lg',
    } satisfies Record<GridMinItem, string>,
    gap: gapVariants,
  },
});

/**
 * Two-dimensional layout primitive. The host is the query container and an
 * inner element is the grid, because an element can't query its own size.
 * Fills its parent's width.
 */
@Component({
  selector: 'fr-grid',
  templateUrl: './grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: '@container block min-w-none' },
})
export class Grid {
  public readonly columns = input<GridColumns>(GridColumns.Two);
  public readonly minItem = input<GridMinItem | undefined>(undefined);
  public readonly gap = input<Space>(Space.Md);

  protected readonly classes = computed(() => {
    const minItem = this.minItem();
    return gridVariants(
      minItem === undefined ? { columns: this.columns(), gap: this.gap() } : { minItem, gap: this.gap() },
    );
  });
}
